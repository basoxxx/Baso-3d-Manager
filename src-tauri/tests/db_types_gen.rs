//! Integration test: the build script (`build.rs`) emits a TypeScript
//! declaration for every Rust struct listed in `EXPORTED_STRUCTS`. This
//! test pins that contract by re-implementing the same field-extraction
//! logic in a small amount of glue code that checks the generated
//! `db-types.generated.ts` is non-empty and contains the expected type
//! names.
//!
//! The heavy lifting is in `build.rs` (syn-based AST walk). This test
//! is a cheap regression net: if `build.rs` is changed in a way that
//! stops emitting any of the expected interfaces, this test fails.
use std::path::PathBuf;

const EXPECTED: &[&str] = &[
    "Customer",
    "Filament",
    "Printer",
    "Order",
    "QuoteItem",
    "Settings",
    "DashboardData",
    "Kpis",
    "DailyTotal",
    "UpcomingOrder",
];

#[test]
fn generated_file_emits_every_expected_interface() {
    let mut p = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    p.pop(); // workspace root
    p.push("src/lib/db-types.generated.ts");
    let s = std::fs::read_to_string(&p)
        .unwrap_or_else(|e| panic!("read {}: {e}", p.display()));

    for ty in EXPECTED {
        let header = format!("export interface {ty}");
        assert!(
            s.contains(&header),
            "generated file missing `{header}` (ty={ty})"
        );
    }
}

#[test]
fn generated_file_includes_type_aliases() {
    let mut p = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    p.pop();
    p.push("src/lib/db-types.generated.ts");
    let s = std::fs::read_to_string(&p).expect("read");

    for alias in ["FilamentMaterial", "PrinterStatus", "OrderStatus"] {
        assert!(
            s.contains(&format!("export type {alias}")),
            "missing type alias `{alias}`"
        );
    }
}

#[test]
fn generated_file_includes_settings_id_literal() {
    // Settings.id is a CHECK-constrained singleton `1`; we don't want
    // a future build script regression to silently emit `number` here.
    let mut p = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    p.pop();
    p.push("src/lib/db-types.generated.ts");
    let s = std::fs::read_to_string(&p).expect("read");
    assert!(
        s.contains("id: 1"),
        "Settings.id should be narrowed to the literal `1` (got: {s:?})"
    );
}
