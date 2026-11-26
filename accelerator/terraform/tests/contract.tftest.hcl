run "desired_services" {
  command = plan
  variables {
    services = { api = "v2", worker = "v3" }
  }
  assert {
    condition = output.versions == tomap({ api = "v2", worker = "v3" })
    error_message = "Expected both named service versions."
  }
}
