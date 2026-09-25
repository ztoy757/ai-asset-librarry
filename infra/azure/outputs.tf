output "app_url" {
  description = "アプリのURL"
  value       = "https://${azurerm_container_app.app.ingress[0].fqdn}"
}
