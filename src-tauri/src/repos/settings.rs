use crate::db::DbPool;
use crate::error::AppResult;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub id: i64,
    pub default_hourly_rate: f64,
    pub default_margin_percent: f64,
    pub currency: String,
    pub vat_rate: f64,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettings {
    pub default_hourly_rate: f64,
    pub default_margin_percent: f64,
    pub currency: String,
    pub vat_rate: f64,
}

pub fn get(pool: &DbPool) -> AppResult<Settings> {
    let conn = pool.get()?;
    let s = conn.query_row(
        "SELECT id, default_hourly_rate, default_margin_percent, currency, vat_rate, updated_at
         FROM settings WHERE id = 1",
        [],
        |r| {
            Ok(Settings {
                id: r.get(0)?,
                default_hourly_rate: r.get(1)?,
                default_margin_percent: r.get(2)?,
                currency: r.get(3)?,
                vat_rate: r.get(4)?,
                updated_at: r.get(5)?,
            })
        },
    )?;
    Ok(s)
}

pub fn update(pool: &DbPool, input: UpdateSettings) -> AppResult<Settings> {
    validate(&input)?;
    let conn = pool.get()?;
    conn.execute(
        "UPDATE settings
         SET default_hourly_rate = ?1,
             default_margin_percent = ?2,
             currency = ?3,
             vat_rate = ?4,
             updated_at = datetime('now')
         WHERE id = 1",
        params![
            input.default_hourly_rate,
            input.default_margin_percent,
            input.currency,
            input.vat_rate,
        ],
    )?;
    get(pool)
}

fn validate(s: &UpdateSettings) -> AppResult<()> {
    use crate::error::AppError;
    if s.default_hourly_rate < 0.0 {
        return Err(AppError::Validation("hourly_rate cannot be negative".into()));
    }
    if s.default_margin_percent < 0.0 {
        return Err(AppError::Validation("margin_percent cannot be negative".into()));
    }
    if s.vat_rate < 0.0 {
        return Err(AppError::Validation("vat_rate cannot be negative".into()));
    }
    if s.currency.trim().len() != 3 {
        return Err(AppError::Validation("currency must be 3 chars (ISO 4217)".into()));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    fn pool() -> DbPool {
        let mut p = std::env::temp_dir();
        p.push(format!("baso-test-{}.db", uuid::Uuid::new_v4()));
        let pool = db::init_pool(&p).unwrap();
        db::run_migrations(&pool).unwrap();
        pool
    }

    #[test]
    fn get_returns_defaults_after_migration() {
        let p = pool();
        let s = get(&p).unwrap();
        assert_eq!(s.id, 1);
        assert_eq!(s.default_hourly_rate, 2.50);
        assert_eq!(s.default_margin_percent, 40.0);
        assert_eq!(s.vat_rate, 22.0);
        assert_eq!(s.currency, "EUR");
    }

    #[test]
    fn update_persists_values() {
        let p = pool();
        update(&p, UpdateSettings {
            default_hourly_rate: 3.50,
            default_margin_percent: 50.0,
            currency: "USD".into(),
            vat_rate: 10.0,
        }).unwrap();
        let s = get(&p).unwrap();
        assert_eq!(s.default_hourly_rate, 3.50);
        assert_eq!(s.currency, "USD");
    }

    #[test]
    fn validate_rejects_bad_currency() {
        let p = pool();
        let r = update(&p, UpdateSettings {
            default_hourly_rate: 1.0,
            default_margin_percent: 0.0,
            currency: "EURO".into(),
            vat_rate: 0.0,
        });
        assert!(r.is_err());
    }
}
