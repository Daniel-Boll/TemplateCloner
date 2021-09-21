import { Command, flags } from "@oclif/command";

import * as inquirer from "inquirer";
import * as fs from "fs";

import Listr = require("listr");
import execa = require("execa");

class TemplateCloner extends Command {
  static description =
    "This CLI executes - almost - every required steps to create a repo from a private template and set the sync system.";

  static flags = {
    version: flags.version({ char: "v" }),
    help: flags.help({ char: "h" }),
    from: flags.string({ char: "f", description: "source repository" }),
    to: flags.string({ description: "destiny repository" }),
    ssh: flags.string({ description: "generate ssh pair" }),
    public: flags.boolean({ description: "repository privacy mode" }),
    private: flags.boolean({ description: "repository privacy mode" }),
  };

  static args = [{ name: "source repo" }, { name: "destiny repo" }];

  // TODO(daniel): implement the other flags.
  async run() {
    const { args, flags } = this.parse(TemplateCloner);

    const templateOrg: any =
      args["source repo"] || flags.from
        ? { name: args["source repo"] ?? flags.from }
        : await inquirer.prompt([
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
        default: false,
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

    const dir = repoInfo.to.split(/\//).pop();

    if (repoInfo.ssh) {
      await new Listr([
        {
          title: `Generating SSH key (OpenSSH format)`,
          task: () =>
            Promise.resolve(
              execa(
                "ssh-keygen",
                [...`-b 2048 -t rsa -f ./${dir}/sshkey -q -N -C ""`.split(/\s/g)]
              )
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

            if (!fs.existsSync(`${dir}/.github/workflows`)) {
              fs.mkdirSync(`${dir}/.github/workflows`, { recursive: true });
            }

            fs.writeFileSync(
              `${dir}/.github/workflows/sync-repo-test.yml`,
              syncRepoYmlFile
            );
          },
        },
      ]).run();
    }

    // TODO(daniel): manage to change dir
    // await new Listr([
    //   {
    //     title: "Adding new files",
    //     task: async () => {
    //       return execa("cd", `./${dir} && git add .`.split(/\s/));
    //     },
    //   },
    //   {
    //     title: "Creating commit",
    //     task: async () => {
    //       return execa("git", `commit -S -sm "feat: add start up files from cli."`.split(/\s/));
    //     },
    //   },
    //   {
    //     title: "Pushing to origin main",
    //     task: async () => {
    //       return execa("git", ["push", "-u", "origin", "main"]);
    //     },
    //   },
    // ]).run();

    const { open }: any = await inquirer.prompt([
      {
        name: "open",
        type: "confirm",
        message: `remember that you'll still have to fill the secrets in the repo at github.\nSOURCE_REPO: ${repoInfo.to}\nTARGET_BRANCH: main (usually)\nSOURCE_REPO_SSH_PRIVATE_KEY: can be found in the root directory in the file sshkey.\n\nThose secrets can be easily set at https://github.com/${repoInfo.to}/settings/secrets/actions, want to automatically open the repo`,
      },
    ]);

    open && execa("gh", `repo view ${repoInfo.to} --web`.split(/\s/));

    execa(
      "echo",
      `Don't forget to add a deploy key on the template repository with the sshkey.pub`.split(
        /\s/
      )
    );
  }
}

export = TemplateCloner;
