# Azureに接続せず、モックしたプロバイダーでセキュリティ設定を検証する（無料で実行できる）
mock_provider "azurerm" {}
mock_provider "random" {}

run "storage_is_not_public" {
  command = plan

  assert {
    condition     = azurerm_storage_account.assets.allow_nested_items_to_be_public == false
    error_message = "Blobを匿名で公開できる設定になっています"
  }

  assert {
    condition     = azurerm_storage_container.assets.container_access_type == "private"
    error_message = "コンテナが private になっていません"
  }

  assert {
    condition     = azurerm_storage_account.assets.network_rules[0].default_action == "Deny"
    error_message = "Storageへのネットワークアクセスが既定で許可されています"
  }

  assert {
    condition     = azurerm_storage_account.assets.min_tls_version == "TLS1_2" && azurerm_storage_account.assets.https_traffic_only_enabled
    error_message = "TLS1.2未満やHTTPでの接続を許可しています"
  }
}

run "database_stays_in_free_tier" {
  command = plan

  assert {
    condition     = azurerm_postgresql_flexible_server.db.sku_name == "B_Standard_B1ms" && azurerm_postgresql_flexible_server.db.storage_mb <= 32768
    error_message = "PostgreSQLが無料枠（B1ms、32GB）を超える構成になっています"
  }
}

run "app_scales_to_zero" {
  command = plan

  assert {
    condition     = azurerm_container_app.app.template[0].min_replicas == 0
    error_message = "アクセスがないときに停止しない構成になっています（費用がかかります）"
  }
}

run "rejects_invalid_name" {
  command = plan

  variables {
    name = "Invalid_Name"
  }

  expect_failures = [var.name]
}
