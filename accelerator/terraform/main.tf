terraform {
  required_version = ">= 1.7.0"
}
variable "services" {
  type = map(string)
  default = { api = "v1", worker = "v1" }
}
# Implement the missing resource instances and output versions independently.
output "versions" {
  value = {}
}
