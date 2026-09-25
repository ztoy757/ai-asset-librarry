# ローカルのDockerに、アプリ・PostgreSQL・Azuriteを構築する（Terraformの練習用、費用なし）
terraform {
  required_version = ">= 1.9"

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.6"
    }
  }
}

provider "docker" {}

locals {
  azurite_key = "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=="
}

variable "app_port" {
  description = "ホスト側でアプリを公開するポート"
  type        = number
  default     = 3000
}

resource "docker_network" "this" {
  name = "ai-asset-library"
}

resource "docker_image" "postgres" {
  name = "postgres:16-alpine"
}

resource "docker_image" "azurite" {
  name = "mcr.microsoft.com/azure-storage/azurite:3.37.0"
}

resource "docker_image" "app" {
  name = "ai-asset-library-app:local"

  build {
    context = "${path.module}/../../app"
  }

  triggers = {
    source = sha1(join("", [for f in fileset("${path.module}/../../app", "{src,db}/**") : filesha1("${path.module}/../../app/${f}")]))
  }
}

resource "docker_volume" "postgres" {
  name = "ai-asset-library-postgres"
}

resource "docker_volume" "azurite" {
  name = "ai-asset-library-azurite"
}

resource "docker_container" "postgres" {
  name  = "ai-asset-library-db"
  image = docker_image.postgres.image_id
  env   = ["POSTGRES_USER=app", "POSTGRES_PASSWORD=app", "POSTGRES_DB=app"]

  networks_advanced {
    name    = docker_network.this.name
    aliases = ["db"]
  }

  volumes {
    volume_name    = docker_volume.postgres.name
    container_path = "/var/lib/postgresql/data"
  }
}

resource "docker_container" "azurite" {
  name    = "ai-asset-library-blob"
  image   = docker_image.azurite.image_id
  command = ["azurite-blob", "--blobHost", "0.0.0.0", "--location", "/data", "--skipApiVersionCheck"]

  networks_advanced {
    name    = docker_network.this.name
    aliases = ["blob"]
  }

  volumes {
    volume_name    = docker_volume.azurite.name
    container_path = "/data"
  }
}

resource "docker_container" "app" {
  name  = "ai-asset-library-app"
  image = docker_image.app.image_id
  env = [
    "DATABASE_URL=postgres://app:app@db:5432/app",
    "AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=${local.azurite_key};BlobEndpoint=http://blob:10000/devstoreaccount1;",
  ]

  ports {
    internal = 3000
    external = var.app_port
  }

  networks_advanced {
    name = docker_network.this.name
  }

  depends_on = [docker_container.postgres, docker_container.azurite]
}

output "app_url" {
  value = "http://localhost:${var.app_port}"
}
