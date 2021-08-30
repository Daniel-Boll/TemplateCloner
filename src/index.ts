import { Command, flags } from "@oclif/command";

import * as inquirer from "inquirer";
import * as fs from "fs";

import Listr = require("listr");
import execa = require("execa");

class TemplateCloner extends Command {
  static description = "describe the command here";

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({ char: "v" }),
    help: flags.help({ char: "h" }),
    // flag with a value (-n, --name=VALUE)
    name: flags.string({ char: "n", description: "name to print" }),
    // flag with no value (-f, --force)
    force: flags.boolean({ char: "f" }),
  };

  static args = [{ name: "file" }];

  async run() {
    const { flags } = this.parse(TemplateCloner);

    const templateOrg: any = await inquirer.prompt([
      {
        name: "name",
        message: "where are you cloning from",
      },
    ]);

    let repos: any;

    await new Listr([
      {
        title: `Fetching https://github.com/${templateOrg.name} repos`,
        task: async () => {
          repos = await execa("gh", ["repo", "list", templateOrg.name]).then(
            (res) =>
              res.stdout
                .split(/\s/)
                .filter((line) => line.startsWith(templateOrg.name))
                .map((repo) => repo.split("/").pop())
          );
        },
      },
    ]).run();

    const repoInfo = await inquirer.prompt([
      {
        name: "from",
        message: "select a repo",
        type: "list",
        choices: repos.map((repo: string) => ({ name: repo })),
      },
      {
        name: "to",
        message: "where you're gonna clone it (owner/repo)",
      },
      {
        name: "public",
        message: "is the repo public",
        type: "confirm",
      },
      {
        name: "ssh",
        message: "generate the ssh pair",
        type: "confirm",
      },
      {
        name: "yml",
        message: "generate the yml action file",
        type: "confirm",
      },
    ]);

    const command = `repo create -y -p ${templateOrg.name}/${repoInfo.from} ${
      repoInfo.public ? "--public" : "--private"
    } ${repoInfo.to}`;

    await new Listr([
      {
        title: `Creating repo ${repoInfo.to}`,
        task: async () => {
          return Promise.resolve(execa("gh", [...command.split(/\s/)]));
        },
      },
    ])
      .run()
      .catch((err) => console.error(err));

    if (repoInfo.ssh) {
      await new Listr([
        {
          title: `Generating SSH key (OpenSSH format)`,
          task: () =>
            Promise.resolve(
              execa("ssh-keygen", [
                "-b",
                "2048",
                "-t",
                "rsa",
                "-f",
                `./${repoInfo.to.split(/\//).pop()}/sshkey`,
                "-q",
                "-N",
                '""',
              ])
            ),
        },
      ]).run();
    }

    if (repoInfo.yml) {
      await new Listr([
        {
          title: "Creating the action file",
          task: () => {
            const syncRepoYmlFile = `name: sync-repo-with-core

on:
 # Every minute
 # TODO: change this later...
 schedule:
 - cron:  "*/6 * * * *"
 # manual trigger
 workflow_dispatch:

jobs:
 repo-sync:
   environment: Development
   runs-on: ubuntu-latest

   steps:
     # To use this repository's private action, you must check out the repository
     - name: Checkout
       uses: actions/checkout@v2
     - name: actions-template-sync
       uses: AndreasAugustin/actions-template-sync@v0.1.6-draft
       with:
         github_token: \${{ secrets.GITHUB_TOKEN }}
         source_repo_path: \${{ secrets.SOURCE_REPO }}
         upstream_branch: \${{ secrets.TARGET_BRANCH }}
         source_repo_ssh_private_key: \${{ secrets.SOURCE_REPO_SSH_PRIVATE_KEY }}`;
            fs.writeFileSync(
              `${repoInfo.to
                .split(/\//)
                .pop()}/.github/workflows/sync-repo-test.yml`,
              syncRepoYmlFile
            );
          },
        },
      ]).run();
    }
  }
}

export = TemplateCloner;
