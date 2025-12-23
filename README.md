# GitHub Actions for Coolify

This action enables you to interact with [Coolify](https://www.coolify.io/) services by installing [the Coolify CLI](https://github.com/coollabsio/coolify-cli).

## Usage

To install the latest version of `coolify` and use it in GitHub Actions workflows, [create a Coolify API token](https://coolify.io/docs/api-reference/authorization), and add the following step to your workflow:

```yaml
- name: Install coolify
  uses: yarissi/setup-coolify@v1
  with:
    token: ${{ secrets.COOLIFY_API_TOKEN }}
    # Optional: Defaults to https://app.coolify.io
    # url: ${{ secrets.COOLIFY_URL }}
```

### Examples

#### Deploy an application or service

```yaml
- name: Deploy application
  run: coolify deploy name "my-awesome-app"
```

#### Sync environment variables from a file

```yaml
- name: Sync environment variables
  run: coolify app env sync "app-uuid-here" --file .env.production
```

#### List all servers or resources

```yaml
- name: List servers
  run: coolify server list
```

### Arguments

- `token` - (**Required**) A Coolify API token ([Authorization](https://coolify.io/docs/api-reference/authorization)).
- `url` - (Optional) The URL of your Coolify instance. Default: `https://app.coolify.io`
- `version` - (Optional) The version of `coolify` to install. If excluded, the latest release will be used.

## Credits

This action is heavily inspired from [DigitalOcean/action-doctl](https://github.com/digitalocean/action-doctl)

## License

This GitHub Action and associated scripts and documentation in this project are released under the [MIT License](LICENSE).
