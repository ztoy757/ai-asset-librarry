variable "name" {
  description = "リソース名の接頭辞（英小文字と数字のみ、3〜16文字）"
  type        = string
  default     = "aiassetlib"

  validation {
    condition     = can(regex("^[a-z0-9]{3,16}$", var.name))
    error_message = "name は英小文字と数字の3〜16文字にしてください。"
  }
}

variable "location" {
  description = "リージョン"
  type        = string
  default     = "japaneast"
}

variable "app_image" {
  description = "デプロイするアプリのコンテナイメージ"
  type        = string
  default     = "ghcr.io/ztoy757/ai-asset-library:latest"
}
