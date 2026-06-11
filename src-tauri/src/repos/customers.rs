use crate::db::DbPool;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Customer {
    pub id: String,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub vat_number: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct NewCustomer {
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub vat_number: Option<String>,
    pub notes: Option<String>,
}

pub fn list(pool: &DbPool, search: Option<&str>) -> AppResult<Vec<Customer>> {
    let conn = pool.get()?;
    let search_pattern = search.map(|s| format!("%{}%", s.to_lowercase()));

    let mut sql = String::from(
        "SELECT id, name, email, phone, address, vat_number, notes, created_at, deleted_at
         FROM customers WHERE deleted_at IS NULL",
    );
    if search_pattern.is_some() {
        sql.push_str(" AND (LOWER(name) LIKE ?1 OR LOWER(email) LIKE ?1)");
    }
    sql.push_str(" ORDER BY name ASC");

    let mut stmt = conn.prepare(&sql)?;
    let mapper = |row: &rusqlite::Row| -> rusqlite::Result<Customer> {
        Ok(Customer {
            id: row.get(0)?,
            name: row.get(1)?,
            email: row.get(2)?,
            phone: row.get(3)?,
            address: row.get(4)?,
            vat_number: row.get(5)?,
            notes: row.get(6)?,
            created_at: row.get(7)?,
            deleted_at: row.get(8)?,
        })
    };

    let rows = if let Some(p) = search_pattern {
        stmt.query_map([p], mapper)?
            .collect::<Result<Vec<_>, _>>()?
    } else {
        stmt.query_map([], mapper)?
            .collect::<Result<Vec<_>, _>>()?
    };
    Ok(rows)
}

pub fn get(pool: &DbPool, id: &str) -> AppResult<Customer> {
    let conn = pool.get()?;
    let row = conn
        .query_row(
            "SELECT id, name, email, phone, address, vat_number, notes, created_at, deleted_at
             FROM customers WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
            |r| {
                Ok(Customer {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    email: r.get(2)?,
                    phone: r.get(3)?,
                    address: r.get(4)?,
                    vat_number: r.get(5)?,
                    notes: r.get(6)?,
                    created_at: r.get(7)?,
                    deleted_at: r.get(8)?,
                })
            },
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("customer {id}")),
            other => AppError::Db(other),
        })?;
    Ok(row)
}

pub fn create(pool: &DbPool, input: NewCustomer) -> AppResult<Customer> {
    validate(&input)?;
    let id = Uuid::new_v4().to_string();
    let conn = pool.get()?;
    conn.execute(
        "INSERT INTO customers (id, name, email, phone, address, vat_number, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id,
            input.name.trim(),
            input.email.trim(),
            input.phone,
            input.address,
            input.vat_number,
            input.notes,
        ],
    )?;
    get(pool, &id)
}

pub fn update(pool: &DbPool, id: &str, input: NewCustomer) -> AppResult<Customer> {
    validate(&input)?;
    let conn = pool.get()?;
    let changes = conn.execute(
        "UPDATE customers
         SET name=?2, email=?3, phone=?4, address=?5, vat_number=?6, notes=?7
         WHERE id=?1 AND deleted_at IS NULL",
        params![
            id,
            input.name.trim(),
            input.email.trim(),
            input.phone,
            input.address,
            input.vat_number,
            input.notes,
        ],
    )?;
    if changes == 0 {
        return Err(AppError::NotFound(format!("customer {id}")));
    }
    get(pool, id)
}

pub fn soft_delete(pool: &DbPool, id: &str) -> AppResult<()> {
    let conn = pool.get()?;
    let changes = conn.execute(
        "UPDATE customers SET deleted_at = datetime('now') WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
    )?;
    if changes == 0 {
        return Err(AppError::NotFound(format!("customer {id}")));
    }
    Ok(())
}

fn validate(c: &NewCustomer) -> AppResult<()> {
    if c.name.trim().is_empty() {
        return Err(AppError::Validation("name is required".into()));
    }
    if c.name.trim().len() > 255 {
        return Err(AppError::Validation("name too long (max 255)".into()));
    }
    if c.email.trim().is_empty() {
        return Err(AppError::Validation("email is required".into()));
    }
    if !c.email.contains('@') {
        return Err(AppError::Validation("email invalid".into()));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    fn pool() -> DbPool {
        let mut p = std::env::temp_dir();
        p.push(format!("baso-test-{}.db", Uuid::new_v4()));
        let pool = db::init_pool(&p).unwrap();
        db::run_migrations(&pool).unwrap();
        pool
    }

    fn sample() -> NewCustomer {
        NewCustomer {
            name: "Mario Rossi".into(),
            email: "mario@example.com".into(),
            phone: Some("+39 333 1234567".into()),
            address: None,
            vat_number: None,
            notes: None,
        }
    }

    #[test]
    fn create_and_get() {
        let p = pool();
        let c = create(&p, sample()).unwrap();
        assert_eq!(c.name, "Mario Rossi");
        let fetched = get(&p, &c.id).unwrap();
        assert_eq!(fetched.email, "mario@example.com");
    }

    #[test]
    fn list_returns_only_active() {
        let p = pool();
        let c1 = create(&p, sample()).unwrap();
        let mut other = sample();
        other.email = "b@x.it".into();
        let c2 = create(&p, other).unwrap();
        soft_delete(&p, &c2.id).unwrap();

        let all = list(&p, None).unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].id, c1.id);
    }

    #[test]
    fn list_search_filters() {
        let p = pool();
        let mut a = sample();
        a.name = "Mario Rossi".into();
        a.email = "mario@x.it".into();
        create(&p, a).unwrap();
        let mut b = sample();
        b.name = "Studio ABC".into();
        b.email = "info@abc.it".into();
        create(&p, b).unwrap();

        let r = list(&p, Some("mario")).unwrap();
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].name, "Mario Rossi");
    }

    #[test]
    fn update_changes_fields() {
        let p = pool();
        let c = create(&p, sample()).unwrap();
        let mut upd = sample();
        upd.name = "Mario R.".into();
        upd.email = "new@x.it".into();
        let updated = update(&p, &c.id, upd).unwrap();
        assert_eq!(updated.name, "Mario R.");
        assert_eq!(updated.email, "new@x.it");
    }

    #[test]
    fn soft_delete_hides_row() {
        let p = pool();
        let c = create(&p, sample()).unwrap();
        soft_delete(&p, &c.id).unwrap();
        assert!(matches!(get(&p, &c.id), Err(AppError::NotFound(_))));
    }

    #[test]
    fn validate_rejects_empty_name() {
        let mut s = sample();
        s.name = "  ".into();
        let p = pool();
        assert!(matches!(create(&p, s), Err(AppError::Validation(_))));
    }

    #[test]
    fn validate_rejects_invalid_email() {
        let mut s = sample();
        s.email = "no-at-sign".into();
        let p = pool();
        assert!(matches!(create(&p, s), Err(AppError::Validation(_))));
    }
}
