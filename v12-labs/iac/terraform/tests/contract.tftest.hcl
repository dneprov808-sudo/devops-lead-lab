run "version_contract" {
  command = plan
  variables { version = "v2" }
  assert {
    condition = local_file.service.content == "version=v2\n"
    error_message = "Expected reviewed input version in rendered configuration."
  }
}
