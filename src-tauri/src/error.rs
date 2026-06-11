use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("database error: {0}")]
    Db(#[from] rusqlite::Error),

    #[error("pool error: {0}")]
    Pool(#[from] r2d2::Error),

    #[error("not found: {0}")]
    NotFound(String),

    #[error("validation: {0}")]
    Validation(String),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("zip error: {0}")]
    Zip(#[from] zip::result::ZipError),

    #[error("csv error: {0}")]
    Csv(#[from] csv::Error),

    #[error("backup: {0}")]
    Backup(String),

    #[error("serialization: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("internal: {0}")]
    Internal(String),
}

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            AppError::Db(_) => "DB_ERROR",
            AppError::Pool(_) => "POOL_ERROR",
            AppError::NotFound(_) => "NOT_FOUND",
            AppError::Validation(_) => "VALIDATION",
            AppError::Io(_) => "IO_ERROR",
            AppError::Zip(_) => "ZIP_ERROR",
            AppError::Csv(_) => "CSV_ERROR",
            AppError::Backup(_) => "BACKUP_ERROR",
            AppError::Serde(_) => "SERDE_ERROR",
            AppError::Internal(_) => "INTERNAL",
        }
    }
}

impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut s = serializer.serialize_struct("AppError", 2)?;
        s.serialize_field("code", self.code())?;
        s.serialize_field("message", &self.to_string())?;
        s.end()
    }
}

pub type AppResult<T> = std::result::Result<T, AppError>;
