terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "myhorrorstory"
}

resource "aws_s3_bucket" "assets" {
  bucket = "${var.project_name}-assets"
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/${var.project_name}/api"
  retention_in_days = 30
}

output "assets_bucket" {
  value = aws_s3_bucket.assets.bucket
}
