use once_cell::sync::Lazy;
use regex::Regex;
use std::collections::HashSet;
use swc_core::common::DUMMY_SP;
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};
use swc_core::plugin::plugin_transform;
use swc_core::plugin::proxies::TransformPluginProgramMetadata;

static LINE_COMMENT_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"//.*((\r?\n)|$)").expect("valid line comment pattern"));
static PLACEHOLDER_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"__TWL_EXPR_(\d+)__").expect("valid placeholder pattern"));

const MACRO_SOURCE: &str = "twl/macro";

struct TwlMacroTransform {
    cls_identifiers: HashSet<Id>,
}

impl TwlMacroTransform {
    fn new() -> Self {
        Self {
            cls_identifiers: HashSet::new(),
        }
    }

    fn get_placeholder(index: usize) -> String {
        format!("__TWL_EXPR_{index}__")
    }

    fn normalize_class_name_parts(parts: Vec<String>) -> String {
        let joined = parts.join(" ");
        let without_comments = LINE_COMMENT_PATTERN.replace_all(&joined, "");

        without_comments
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
    }

    fn normalize_template_literal(tpl: &Tpl) -> String {
        let mut parts = Vec::with_capacity(tpl.quasis.len() + tpl.exprs.len());

        for (index, quasi) in tpl.quasis.iter().enumerate() {
            parts.push(quasi.raw.to_string());

            if index < tpl.exprs.len() {
                parts.push(Self::get_placeholder(index));
            }
        }

        Self::normalize_class_name_parts(parts)
    }

    fn create_tpl_element(value: String, tail: bool) -> TplElement {
        TplElement {
            span: DUMMY_SP,
            tail,
            cooked: Some(value.clone().into()),
            raw: value.into(),
        }
    }

    fn build_replacement(normalized: String, expressions: Vec<Box<Expr>>) -> Expr {
        let mut tpl_expressions = Vec::new();
        let mut tpl_quasis = Vec::new();
        let mut cursor = 0usize;

        for capture in PLACEHOLDER_PATTERN.captures_iter(&normalized) {
            let matched = capture
                .get(0)
                .expect("placeholder captures always contain the full match");
            let expression_index = capture[1]
                .parse::<usize>()
                .expect("placeholder index is always a valid number");

            tpl_quasis.push(normalized[cursor..matched.start()].to_string());
            tpl_expressions.push(expressions[expression_index].clone());
            cursor = matched.end();
        }

        if tpl_expressions.is_empty() {
            return Expr::Lit(Lit::Str(Str {
                span: DUMMY_SP,
                value: normalized.into(),
                raw: None,
            }));
        }

        tpl_quasis.push(normalized[cursor..].to_string());

        let quasis_len = tpl_quasis.len();

        Expr::Tpl(Tpl {
            span: DUMMY_SP,
            exprs: tpl_expressions,
            quasis: tpl_quasis
                .into_iter()
                .enumerate()
                .map(|(index, value)| Self::create_tpl_element(value, index + 1 == quasis_len))
                .collect(),
        })
    }

    fn get_named_import(specifier: &ImportNamedSpecifier) -> Option<&str> {
        match &specifier.imported {
            Some(ModuleExportName::Ident(ident)) => Some(ident.sym.as_ref()),
            Some(ModuleExportName::Str(value)) => value.value.as_str(),
            None => Some(specifier.local.sym.as_ref()),
        }
    }

    fn collect_macro_imports(&mut self, module: &mut Module) {
        let mut body = Vec::with_capacity(module.body.len());

        for item in module.body.drain(..) {
            let ModuleItem::ModuleDecl(ModuleDecl::Import(import_decl)) = &item else {
                body.push(item);
                continue;
            };

            if import_decl.src.value != MACRO_SOURCE {
                body.push(item);
                continue;
            }

            let mut has_cls_import = false;

            for specifier in &import_decl.specifiers {
                let ImportSpecifier::Named(named) = specifier else {
                    continue;
                };

                if Self::get_named_import(named) == Some("cls") {
                    self.cls_identifiers.insert(named.local.to_id());
                    has_cls_import = true;
                }
            }

            if !has_cls_import {
                body.push(item);
            }
        }

        module.body = body;
    }

    fn transform_tagged_template(&self, tagged_tpl: &TaggedTpl) -> Option<Expr> {
        let Expr::Ident(ident) = tagged_tpl.tag.as_ref() else {
            return None;
        };

        if !self.cls_identifiers.contains(&ident.to_id()) {
            return None;
        }

        let normalized = Self::normalize_template_literal(&tagged_tpl.tpl);

        Some(Self::build_replacement(
            normalized,
            tagged_tpl.tpl.exprs.clone(),
        ))
    }
}

impl VisitMut for TwlMacroTransform {
    fn visit_mut_module(&mut self, module: &mut Module) {
        self.collect_macro_imports(module);
        module.visit_mut_children_with(self);
    }

    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        expr.visit_mut_children_with(self);

        let Expr::TaggedTpl(tagged_tpl) = expr else {
            return;
        };

        if let Some(replacement) = self.transform_tagged_template(tagged_tpl) {
            *expr = replacement;
        }
    }
}

#[plugin_transform]
pub fn process_transform(
    mut program: Program,
    _metadata: TransformPluginProgramMetadata,
) -> Program {
    program.visit_mut_with(&mut TwlMacroTransform::new());
    program
}
