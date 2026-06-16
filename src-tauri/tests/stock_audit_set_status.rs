//! Integration test: when set_status moves an order to
//! in_produzione, the stock_audit_log gets a row per item with
//! reason='order_production'. And reverting (in_produzione -> draft)
//! creates a matching order_revert row.

use baso_3d_manager_lib::db;
use baso_3d_manager_lib::repos::{customers, filaments, orders, stock_audit};

fn pool() -> baso_3d_manager_lib::db::DbPool {
    let mut p = std::env::temp_dir();
    p.push(format!("baso-audit-int-{}.db", uuid::Uuid::new_v4()));
    let pool = db::init_pool(&p).unwrap();
    db::run_migrations(&pool).unwrap();
    pool
}

fn seed_customer(p: &baso_3d_manager_lib::db::DbPool) -> String {
    let c = customers::create(
        p,
        customers::NewCustomer {
            name: "Test".into(),
            email: "t@x.it".into(),
            phone: None,
            address: None,
            vat_number: None,
            notes: None,
        },
    )
    .unwrap();
    c.id
}

fn seed_filament(p: &baso_3d_manager_lib::db::DbPool, stock: f64) -> String {
    let f = filaments::create(
        p,
        filaments::NewFilament {
            brand: "X".into(),
            material: "PLA".into(),
            color: None,
            diameter: 1.75,
            density: None,
            price_per_kg: 20.0,
            stock_grams: stock,
            low_stock_threshold: 100.0,
        },
    )
    .unwrap();
    f.id
}

#[test]
fn in_produzione_writes_one_audit_row_per_item_with_filament() {
    let p = pool();
    let cid = seed_customer(&p);
    let fid = seed_filament(&p, 1000.0);

    let qis = vec![
        baso_3d_manager_lib::repos::quote_items::NewQuoteItem {
            description: "A".into(),
            quantity: 2,
            time_hours: 0.0,
            material_grams: 100.0,
            filament_id: Some(fid.clone()),
            post_processing_cost: 0.0,
        },
        baso_3d_manager_lib::repos::quote_items::NewQuoteItem {
            description: "B".into(),
            quantity: 1,
            time_hours: 0.0,
            material_grams: 50.0,
            filament_id: None,
            post_processing_cost: 0.0,
        },
    ];
    let (order, _) = orders::create(
        &p,
        baso_3d_manager_lib::repos::orders::NewOrder {
            customer_id: cid,
            status: "draft".into(),
            notes: None,
            margin_percent: 40.0,
            apply_vat: true,
            quote_items: qis,
        },
    )
    .unwrap();

    orders::set_status(&p, &order.id, "in_produzione").unwrap();

    let f = filaments::get(&p, &fid).unwrap();
    assert_eq!(f.stock_grams, 800.0);

    let entries = stock_audit::list_for_filament(&p, &fid, None).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].delta_grams, -200.0);
    assert_eq!(entries[0].stock_after, 800.0);
    assert_eq!(entries[0].reason, "order_production");
    assert_eq!(entries[0].order_id.as_deref(), Some(order.id.as_str()));
}

#[test]
fn revert_writes_order_revert_audit_row_and_restores_stock() {
    let p = pool();
    let cid = seed_customer(&p);
    let fid = seed_filament(&p, 500.0);
    let (order, _) = orders::create(
        &p,
        baso_3d_manager_lib::repos::orders::NewOrder {
            customer_id: cid,
            status: "draft".into(),
            notes: None,
            margin_percent: 40.0,
            apply_vat: true,
            quote_items: vec![baso_3d_manager_lib::repos::quote_items::NewQuoteItem {
                description: "X".into(),
                quantity: 1,
                time_hours: 0.0,
                material_grams: 100.0,
                filament_id: Some(fid.clone()),
                post_processing_cost: 0.0,
            }],
        },
    )
    .unwrap();
    orders::set_status(&p, &order.id, "in_produzione").unwrap();
    orders::set_status(&p, &order.id, "draft").unwrap();

    let f = filaments::get(&p, &fid).unwrap();
    assert_eq!(f.stock_grams, 500.0);

    let entries = stock_audit::list_for_filament(&p, &fid, None).unwrap();
    assert_eq!(entries.len(), 2);
    let newest = &entries[0];
    assert_eq!(newest.reason, "order_revert");
    assert_eq!(newest.delta_grams, 100.0);
    assert_eq!(newest.stock_after, 500.0);
    let older = &entries[1];
    assert_eq!(older.reason, "order_production");
    assert_eq!(older.delta_grams, -100.0);
}

#[test]
fn manual_adjust_writes_manual_adjust_audit_row() {
    let p = pool();
    let fid = seed_filament(&p, 1000.0);
    filaments::adjust_stock(&p, &fid, -100.0).unwrap();

    let entries = stock_audit::list_for_filament(&p, &fid, None).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].reason, "manual_adjust");
    assert_eq!(entries[0].delta_grams, -100.0);
    assert_eq!(entries[0].stock_after, 900.0);
    assert!(entries[0].order_id.is_none());
}

#[test]
fn audit_log_persists_across_db_reopen() {
    // Use a stable path so the second connection sees the same file.
    let mut p = std::env::temp_dir();
    p.push(format!("baso-audit-persist-{}.db", uuid::Uuid::new_v4()));
    let pool1 = db::init_pool(&p).unwrap();
    db::run_migrations(&pool1).unwrap();
    let fid = seed_filament(&pool1, 1000.0);
    filaments::adjust_stock(&pool1, &fid, -50.0).unwrap();
    drop(pool1);

    let pool2 = db::init_pool(&p).unwrap();
    // Migrations are idempotent; the audit row is still there.
    let entries = stock_audit::list_for_filament(&pool2, &fid, None).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].delta_grams, -50.0);
    let _ = std::fs::remove_file(&p);
}
