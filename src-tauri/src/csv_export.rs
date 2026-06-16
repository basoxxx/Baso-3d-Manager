use crate::error::AppResult;
use rusqlite::Connection;
use std::io::Write;
use std::path::Path;

/// Domains for which we can produce a CSV. Used by the export command
/// to validate the request and pick the right default filename.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExportDomain {
    Customers,
    Filaments,
    Printers,
    Orders,
}

impl ExportDomain {
    /// Parse from a string the frontend sends. Returns `None` for
    /// unknown domains so the caller can return a 400.
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "customers" => Some(Self::Customers),
            "filaments" => Some(Self::Filaments),
            "printers" => Some(Self::Printers),
            "orders" => Some(Self::Orders),
            _ => None,
        }
    }

    /// Default filename (no extension), e.g. `baso-customers-2026-06-16`.
    pub fn default_filename(&self) -> String {
        let now = chrono::Local::now().format("%Y-%m-%d");
        match self {
            Self::Customers => format!("baso-customers-{now}"),
            Self::Filaments => format!("baso-filaments-{now}"),
            Self::Printers => format!("baso-printers-{now}"),
            Self::Orders => format!("baso-orders-{now}"),
        }
    }
}

pub fn write_customers_csv(conn: &Connection, path: &Path) -> AppResult<()> {
    let mut wtr = write_with_bom(path)?;
    wtr.write_record([
        "ID", "Nome", "Email", "Telefono", "Indirizzo", "P.IVA", "Note", "Creato",
    ])?;
    let mut stmt = conn.prepare(
        "SELECT id, name, email, phone, address, vat_number, notes, created_at
         FROM customers WHERE deleted_at IS NULL
         ORDER BY name COLLATE NOCASE ASC",
    )?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        wtr.write_record([
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, Option<String>>(3)?.unwrap_or_default(),
            row.get::<_, Option<String>>(4)?.unwrap_or_default(),
            row.get::<_, Option<String>>(5)?.unwrap_or_default(),
            row.get::<_, Option<String>>(6)?.unwrap_or_default(),
            format_it_date(&row.get::<_, String>(7)?),
        ])?;
    }
    wtr.flush()?;
    Ok(())
}

pub fn write_printers_csv(conn: &Connection, path: &Path) -> AppResult<()> {
    let mut wtr = write_with_bom(path)?;
    wtr.write_record([
        "ID", "Nome", "Modello", "Volume X (mm)", "Volume Y (mm)", "Volume Z (mm)",
        "Stato", "Note", "Creato",
    ])?;
    let mut stmt = conn.prepare(
        "SELECT id, name, model, build_volume_x, build_volume_y, build_volume_z,
                status, notes, created_at
         FROM printers WHERE deleted_at IS NULL
         ORDER BY name COLLATE NOCASE ASC",
    )?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        wtr.write_record([
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, Option<String>>(2)?.unwrap_or_default(),
            row.get::<_, Option<i64>>(3)?.map(|n| n.to_string()).unwrap_or_default(),
            row.get::<_, Option<i64>>(4)?.map(|n| n.to_string()).unwrap_or_default(),
            row.get::<_, Option<i64>>(5)?.map(|n| n.to_string()).unwrap_or_default(),
            row.get::<_, String>(6)?,
            row.get::<_, Option<String>>(7)?.unwrap_or_default(),
            format_it_date(&row.get::<_, String>(8)?),
        ])?;
    }
    wtr.flush()?;
    Ok(())
}

pub fn write_orders_csv(conn: &Connection, path: &Path) -> AppResult<()> {
    let mut wtr = write_with_bom(path)?;
    wtr.write_record([
        "ID", "Cliente", "Stato", "Note", "Margine %", "Creato", "Aggiornato",
    ])?;
    let mut stmt = conn.prepare(
        "SELECT o.id, COALESCE(c.name, ''), o.status, COALESCE(o.notes, ''),
                o.margin_percent, o.created_at, o.updated_at
         FROM orders o
         LEFT JOIN customers c ON c.id = o.customer_id
         WHERE o.deleted_at IS NULL
         ORDER BY o.created_at DESC",
    )?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        wtr.write_record([
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            format_it_number(row.get::<_, f64>(4)?),
            format_it_date(&row.get::<_, String>(5)?),
            format_it_date(&row.get::<_, String>(6)?),
        ])?;
    }
    wtr.flush()?;
    Ok(())
}

pub fn write_filaments_csv(conn: &Connection, path: &Path) -> AppResult<()> {
    let mut wtr = write_with_bom(path)?;
    wtr.write_record([
        "ID", "Marca", "Materiale", "Colore", "Diametro (mm)", "Densità (g/cm³)",
        "Prezzo €/kg", "Stock (g)", "Soglia (g)", "Creato",
    ])?;
    let mut stmt = conn.prepare(
        "SELECT id, brand, material, color, diameter, density, price_per_kg,
                stock_grams, low_stock_threshold, created_at
         FROM filaments WHERE deleted_at IS NULL ORDER BY brand ASC",
    )?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        wtr.write_record([
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, Option<String>>(3)?.unwrap_or_default(),
            format_it_number(row.get::<_, f64>(4)?),
            row.get::<_, Option<f64>>(5)?.map(format_it_number).unwrap_or_default(),
            format_it_currency(row.get::<_, f64>(6)?),
            format_it_number(row.get::<_, f64>(7)?),
            format_it_number(row.get::<_, f64>(8)?),
            format_it_date(&row.get::<_, String>(9)?),
        ])?;
    }
    wtr.flush()?;
    Ok(())
}

fn write_with_bom(path: &Path) -> AppResult<csv::Writer<Box<dyn Write>>> {
    let file = std::fs::File::create(path)?;
    let mut buf: Box<dyn Write> = Box::new(file);
    buf.write_all(&[0xEF, 0xBB, 0xBF])?; // UTF-8 BOM
    let wtr = csv::WriterBuilder::new()
        .delimiter(b';')
        .quote_style(csv::QuoteStyle::Necessary)
        .from_writer(buf);
    Ok(wtr)
}

fn format_it_number(n: f64) -> String {
    let s = format!("{:.2}", n);
    let (int, dec) = s.split_once('.').unwrap_or((&s, "00"));
    let int_with_dots = int
        .chars()
        .rev()
        .collect::<Vec<_>>()
        .chunks(3)
        .map(|c| c.iter().collect::<String>())
        .collect::<Vec<_>>()
        .join(".")
        .chars()
        .rev()
        .collect::<String>();
    format!("{},{}", int_with_dots, dec)
}

fn format_it_currency(n: f64) -> String {
    format!("€ {}", format_it_number(n))
}

fn format_it_date(iso: &str) -> String {
    // accepts "YYYY-MM-DD HH:MM:SS" or RFC3339
    if let Some(date) = iso.split_whitespace().next() {
        let parts: Vec<&str> = date.split('-').collect();
        if parts.len() == 3 {
            return format!("{}/{}/{}", parts[2], parts[1], parts[0]);
        }
    }
    iso.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_number_formats() {
        assert_eq!(format_it_number(1234.56), "1.234,56");
        assert_eq!(format_it_number(0.5), "0,50");
        assert_eq!(format_it_number(1000.0), "1.000,00");
    }

    #[test]
    fn it_date_formats() {
        assert_eq!(format_it_date("2026-06-11 14:30:00"), "11/06/2026");
        assert_eq!(format_it_date("2026-01-01"), "01/01/2026");
    }

    #[test]
    fn it_currency_formats() {
        assert_eq!(format_it_currency(22.5), "€ 22,50");
    }

    #[test]
    fn export_domain_roundtrips() {
        for d in [
            ExportDomain::Customers,
            ExportDomain::Filaments,
            ExportDomain::Printers,
            ExportDomain::Orders,
        ] {
            let s = match d {
                ExportDomain::Customers => "customers",
                ExportDomain::Filaments => "filaments",
                ExportDomain::Printers => "printers",
                ExportDomain::Orders => "orders",
            };
            assert_eq!(ExportDomain::parse(s), Some(d));
            assert!(
                d.default_filename().contains(s),
                "default filename should mention the domain, got {}",
                d.default_filename()
            );
        }
    }

    #[test]
    fn export_domain_parse_rejects_unknown() {
        assert_eq!(ExportDomain::parse("unknown"), None);
        assert_eq!(ExportDomain::parse(""), None);
    }
}


#[cfg(test)]
mod integration_tests {
    use super::*;
    use crate::db;
    use crate::repos::{customers, filaments, printers};

    fn fresh_pool() -> crate::db::DbPool {
        let mut p = std::env::temp_dir();
        p.push(format!("baso-csv-int-{}.db", uuid::Uuid::new_v4()));
        let pool = db::init_pool(&p).unwrap();
        db::run_migrations(&pool).unwrap();
        pool
    }

    fn write_and_read(conn: &Connection, write: impl FnOnce(&Connection, &Path) -> AppResult<()>) -> String {
        let mut p = std::env::temp_dir();
        p.push(format!("baso-csv-{}.csv", uuid::Uuid::new_v4()));
        write(conn, &p).unwrap();
        std::fs::read_to_string(&p).unwrap()
    }

    #[test]
    fn customers_csv_writes_bom_headers_and_rows() {
        let pool = fresh_pool();
        customers::create(
            &pool,
            customers::NewCustomer {
                name: "Alice".into(),
                email: "alice@example.com".into(),
                phone: Some("+39 333 1234567".into()),
                address: None,
                vat_number: None,
                notes: None,
            },
        ).unwrap();
        let c = std::sync::Arc::new(pool);
        let conn = c.get().unwrap();
        let csv = write_and_read(&conn, |c, p| write_customers_csv(c, p));
        // BOM (UTF-8: 0xEF 0xBB 0xBF)
        assert!(csv.as_bytes().starts_with(&[0xEF, 0xBB, 0xBF]), "missing BOM");
        // Header row uses ; (Italian Excel)
        let body = csv.trim_start_matches("\u{FEFF}");
        let first_line = body.lines().next().unwrap();
        assert!(first_line.contains("Nome"), "header missing: {first_line}");
        assert!(first_line.contains("Email"), "header missing: {first_line}");
        // The customer name shows up
        assert!(csv.contains("Alice"));
        assert!(csv.contains("alice@example.com"));
    }

    #[test]
    fn printers_csv_writes_rows_including_nullable_volumes() {
        let pool = fresh_pool();
        printers::create(
            &pool,
            printers::NewPrinter {
                name: "Voron 2.4".into(),
                model: Some("R2".into()),
                build_volume_x: Some(350),
                build_volume_y: Some(350),
                build_volume_z: Some(350),
                status: "active".into(),
                notes: None,
            },
        ).unwrap();
        // Insert a printer with NULL volumes.
        let conn = pool.get().unwrap();
        conn.execute(
            "INSERT INTO printers (id, name, model, status) VALUES ('p-2', 'Bare', NULL, 'maintenance')",
            [],
        ).unwrap();
        let csv = write_and_read(&conn, |c, p| write_printers_csv(c, p));
        assert!(csv.contains("Voron 2.4"));
        assert!(csv.contains("350")); // volume rendered
        assert!(csv.contains("Bare"));
        // Bare row has no volume columns
        let bare_line = csv.lines().find(|l| l.contains("Bare")).unwrap();
        // Name;model;;;status;;date  -> volumes blank, model blank
        // With delimiter ';' the empty fields are consecutive separators.
        assert!(bare_line.contains(";;;"));
    }

    #[test]
    fn orders_csv_joins_customer_name() {
        let pool = fresh_pool();
        let cid = customers::create(
            &pool,
            customers::NewCustomer {
                name: "Bob".into(),
                email: "bob@example.com".into(),
                phone: None, address: None, vat_number: None, notes: None,
            },
        ).unwrap();
        // Insert an order directly with a known created_at.
        let oid = uuid::Uuid::new_v4().to_string();
        let conn = pool.get().unwrap();
        conn.execute(
            "INSERT INTO orders (id, customer_id, status, margin_percent, apply_vat, created_at)
             VALUES (?1, ?2, 'draft', 40, 1, '2025-06-11 10:00:00')",
            rusqlite::params![oid, cid.id],
        ).unwrap();
        let csv = write_and_read(&conn, |c, p| write_orders_csv(c, p));
        assert!(csv.contains("Bob"));
        // The Italian date format is dd/mm/yyyy.
        assert!(csv.contains("11/06/2025"));
    }

    #[test]
    fn filaments_csv_uses_currency_format() {
        let pool = fresh_pool();
        filaments::create(
            &pool,
            filaments::NewFilament {
                brand: "Prusament".into(),
                material: "PLA".into(),
                color: None,
                diameter: 1.75,
                density: None,
                price_per_kg: 24.5,
                stock_grams: 1000.0,
                low_stock_threshold: 200.0,
            },
        ).unwrap();
        let conn = pool.get().unwrap();
        let csv = write_and_read(&conn, |c, p| write_filaments_csv(c, p));
        assert!(csv.contains("Prusament"));
        // format_it_currency emits "€ 24,50"
        assert!(csv.contains("€ 24,50"));
    }
}
