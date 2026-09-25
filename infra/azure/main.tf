resource "azurerm_resource_group" "this" {
  name     = "rg-${var.name}"
  location = var.location
}

# ---------- ファイル本体（Blob） ----------

resource "azurerm_storage_account" "assets" {
  name                     = "st${var.name}"
  resource_group_name      = azurerm_resource_group.this.name
  location                 = azurerm_resource_group.this.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"
  access_tier              = "Hot"

  min_tls_version                 = "TLS1_2"
  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = false

  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 7
    }
  }
}

resource "azurerm_storage_container" "assets" {
  name                  = "assets"
  storage_account_id    = azurerm_storage_account.assets.id
  container_access_type = "private"
}

# ---------- メタデータ（PostgreSQL） ----------

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "azurerm_postgresql_flexible_server" "db" {
  name                = "psql-${var.name}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  version             = "16"

  # 無料アカウントの12ヶ月無料枠の対象（Burstable B1ms、32GB）
  sku_name   = "B_Standard_B1ms"
  storage_mb = 32768

  administrator_login    = "appadmin"
  administrator_password = random_password.db.result

  backup_retention_days        = 7
  geo_redundant_backup_enabled = false

  lifecycle {
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_database" "app" {
  name      = "app"
  server_id = azurerm_postgresql_flexible_server.db.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# ---------- アプリ（Container Apps） ----------

resource "azurerm_container_app_environment" "this" {
  name                = "cae-${var.name}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
}

resource "azurerm_container_app" "app" {
  name                         = "ca-${var.name}"
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  revision_mode                = "Single"

  secret {
    name  = "database-url"
    value = "postgres://appadmin:${random_password.db.result}@${azurerm_postgresql_flexible_server.db.fqdn}:5432/app?sslmode=require"
  }

  secret {
    name  = "storage-connection-string"
    value = azurerm_storage_account.assets.primary_connection_string
  }

  template {
    min_replicas = 0
    max_replicas = 1

    container {
      name   = "app"
      image  = var.app_image
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }

      env {
        name        = "AZURE_STORAGE_CONNECTION_STRING"
        secret_name = "storage-connection-string"
      }

      env {
        name  = "BLOB_CONTAINER"
        value = azurerm_storage_container.assets.name
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 3000

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}
