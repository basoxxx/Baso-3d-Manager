use crate::error::AppResult;
use rusqlite::Connection;
use std::io::Write;
use std::path::Path;

pub fn write_orders_csv(conn: &Connection, path: &Path) -> AppResult<()> {
    let mut wtr = write_with_bom(path)?;
    wtr.write_record(&[
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
        wtr.write_record(&[
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
    wtr.write_record(&[
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
        wtr.write_record(&[
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
}
