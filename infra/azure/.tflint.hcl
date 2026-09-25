plugin "terraform" {
  enabled = true
  preset  = "recommended"
}

plugin "azurerm" {
  enabled = true
  version = "0.32.0"
  source  = "github.com/terraform-linters/tflint-ruleset-azurerm"
}

# 検証用の環境で、使い終わったら terraform destroy で消す運用のため、
# 削除を禁止する prevent_destroy は付けない
rule "azurerm_resources_missing_prevent_destroy" {
  enabled = false
}
