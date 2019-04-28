workflow "Check" {
  on = "push"
  resolves = ["Build", "Test"]
}

workflow "Publish" {
  on = "create"
  resolves = "NPM Push"
}

workflow "Tag Latest" {
  on = "create"
  resolves = "NPM Latest"
}

action "Install" {
  uses = "docker://node:10"
  runs = "npm"
  args = "install"
}

action "Build" {
  uses = "docker://node:10"
  needs = "Install"
  runs = "npm"
  args = "run build"
}

action "Test" {
  uses = "docker://node:10"
  needs = "Install"
  runs = "npm"
  args = "test"
}

action "Tag Check: version" {
  uses = "actions/bin/filter@master"
  needs = ["Build", "Test"]
  args = "tag v/*"
}

action "NPM Pack" {
  uses = "actions/npm@master"
  needs = "Tag Check: version"
  args = "pack"
}

action "NPM Push" {
  uses = "actions/npm@master"
  needs = "NPM Pack"
  args = "publish *.tgz --tag=next"
  secrets = ["NPM_AUTH_TOKEN"]
}

action "Tag Check: latest" {
  uses = "actions/bin/filter@master"
  args = "tag lv/*"
}

action "NPM Latest" {
  uses = "actions/npm@master"
  needs = "Tag Check: latest"
  args = "dist-tag add buffer-pond@${npm run -s version} latest"
  secrets = ["NPM_AUTH_TOKEN"]
}