terraform {
  required_version = "~> 1.9"
  required_providers {
    local = {
      source = "hashicorp/local"
      version = "2.5.3"
    }
  }
}
variable "version" {
  type = string
  default = "v1"
}
resource "local_file" "service" {
  filename = "${path.module}/.lab-data/service.conf"
  content = "version=${var.version}\n"
  file_permission = "0640"
}
output "version" {
  value = var.version
}
