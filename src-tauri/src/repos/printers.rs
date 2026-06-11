use crate::db::DbPool;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Printer {
    pub id: String,
    pub name: String,
    pub model: Option<String>,
    pub build_volume_x: Option<i64>,
    pub build_volume_y: Option<i64>,
    pub build_volume_z: Option<i64>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct NewPrinter {
    pub name: String,
    pub model: Option<String>,
    pub build_volume_x: Option<i64>,
    pub build_volume_y: Option<i64>,
    pub build_volume_z: Option<i64>,
    pub status: String,
    pub notes: Option<String>,
}

const STATUSES: &[&str] = &["active", "maintenance", "retired"];

pub fn list(pool: &DbPool) -> AppResult<Vec<Printer>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, name, model, build_volume_x, build_volume_y, build_volume_z,
                status, notes, created_at, deleted_at
         FROM printers WHERE deleted_at IS NULL
         ORDER BY name ASC",
    )?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Printer {
                id: row.get(0)?,
                name: row.get(1)?,
                model: row.get(2)?,
                build_volume_x: row.get(3)?,
                build_volume_y: row.get(4)?,
                build_volume_z: row.get(5)?,
                status: row.get(6)?,
                notes: row.get(7)?,
                created_at: row.get(8)?,
                deleted_at: row.get(9)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn get(pool: &DbPool, id: &str) -> AppResult<Printer> {
    let conn = pool.get()?;
    conn.query_row(
        "SELECT id, name, model, build_volume_x, build_volume_y, build_volume_z,
                status, notes, created_at, deleted_at
         FROM printers WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
        |r| {
            Ok(Printer {
                id: r.get(0)?,
                name: r.get(1)?,
                model: r.get(2)?,
                build_volume_x: r.get(3)?,
                build_volume_y: r.get(4)?,
                build_volume_z: r.get(5)?,
                status: r.get(6)?,
                notes: r.get(7)?,
                created_at: r.get(8)?,
                deleted_at: r.get(9)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("printer {id}")),
        other => AppError::Db(other),
    })
}

pub fn create(pool: &DbPool, input: NewPrinter) -> AppResult<Printer> {
    validate(&input)?;
    let id = Uuid::new_v4().to_string();
    let conn = pool.get()?;
    conn.execute(
        "INSERT INTO printers
         (id, name, model, build_volume_x, build_volume_y, build_volume_z, status, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            input.name.trim(),
            input.model,
            input.build_volume_x,
            input.build_volume_y,
            input.build_volume_z,
            input.status,
            input.notes,
        ],
    )?;
    get(pool, &id)
}

pub fn update(pool: &DbPool, id: &str, input: NewPrinter) -> AppResult<Printer> {
    validate(&input)?;
    let conn = pool.get()?;
    let changes = conn.execute(
        "UPDATE printers
         SET name=?2, model=?3, build_volume_x=?4, build_volume_y=?5,
             build_volume_z=?6, status=?7, notes=?8
         WHERE id=?1 AND deleted_at IS NULL",
        params![
            id,
            input.name.trim(),
            input.model,
            input.build_volume_x,
            input.build_volume_y,
            input.build_volume_z,
            input.status,
            input.notes,
        ],
    )?;
    if changes == 0 {
        return Err(AppError::NotFound(format!("printer {id}")));
    }
    get(pool, id)
}

pub fn soft_delete(pool: &DbPool, id: &str) -> AppResult<()> {
    let conn = pool.get()?;
    let changes = conn.execute(
        "UPDATE printers SET deleted_at = datetime('now') WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
    )?;
    if changes == 0 {
        return Err(AppError::NotFound(format!("printer {id}")));
    }
    Ok(())
}

fn validate(p: &NewPrinter) -> AppResult<()> {
    if p.name.trim().is_empty() {
        return Err(AppError::Validation("name is required".into()));
    }
    if !STATUSES.contains(&p.status.as_str()) {
        return Err(AppError::Validation(format!("invalid status: {}", p.status)));
    }
    for (label, val) in [("x", p.build_volume_x), ("y", p.build_volume_y), ("z", p.build_volume_z)] {
        if let Some(v) = val {
            if v <= 0 {
                return Err(AppError::Validation(format!("build_volume_{label} must be > 0")));
            }
        }
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

    fn sample() -> NewPrinter {
        NewPrinter {
            name: "Prusa MK4".into(),
            model: Some("MK4".into()),
            build_volume_x: Some(250),
            build_volume_y: Some(210),
            build_volume_z: Some(220),
            status: "active".into(),
            notes: None,
        }
    }

    #[test]
    fn create_and_list() {
        let p = pool();
        create(&p, sample()).unwrap();
        let all = list(&p).unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].name, "Prusa MK4");
    }

    #[test]
    fn update_changes_status() {
        let p = pool();
        let pr = create(&p, sample()).unwrap();
        let mut upd = sample();
        upd.status = "maintenance".into();
        let pr2 = update(&p, &pr.id, upd).unwrap();
        assert_eq!(pr2.status, "maintenance");
    }

    #[test]
    fn soft_delete_hides() {
        let p = pool();
        let pr = create(&p, sample()).unwrap();
        soft_delete(&p, &pr.id).unwrap();
        assert!(list(&p).unwrap().is_empty());
    }

    #[test]
    fn validate_rejects_invalid_status() {
        let mut s = sample();
        s.status = "broken".into();
        let p = pool();
        assert!(matches!(create(&p, s), Err(AppError::Validation(_))));
    }

    #[test]
    fn validate_rejects_zero_volume() {
        let mut s = sample();
        s.build_volume_x = Some(0);
        let p = pool();
        assert!(matches!(create(&p, s), Err(AppError::Validation(_))));
    }
}
