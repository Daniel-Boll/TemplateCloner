TemplateCloner
==============

This CLI executes - almost - every required steps to create a repo from a private template and set the sync system.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/TemplateCloner.svg)](https://npmjs.org/package/templatecloner)
[![Downloads/week](https://img.shields.io/npm/dw/TemplateCloner.svg)](https://npmjs.org/package/templatecloner)
[![License](https://img.shields.io/npm/l/TemplateCloner.svg)](https://github.com/Daniel-Boll/TemplateCloner/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Workflow](#workflow)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g TemplateCloner
$ template-cloner COMMAND
running command...
$ template-cloner (-v|--version|version)
TemplateCloner/1.1.0 linux-x64 node-v16.8.0
$ template-cloner --help [COMMAND]
USAGE
  $ template-cloner COMMAND
...
```
<!-- usagestop -->
# Workflow
<!-- workflow -->

First you need to have a template repository to *"fork"* from. 

Then with the gh cli you can

```bash
gh repo create -y -p {SourceRepo(User/Org)}/{SourceRepo} --(public|private) {DestinyRepo(User/Org)}/{DestinyRepo} 
```

Then all you need to do is create a sshkey pair and a github action to sync up with your repo.

But the `template-clone` cli do all of this to you.

```bash
template-cloner
? where are you cloning from # Here you informe the {SourceRepo(User/Org)}
                             # for example Daniel-Boll

? select a repo (Use arrow keys) # Then it will list all the repos from that user/org
❯ TemplateCloner                 # you just have to select which one you want to clone
...                              # from
(Move up and down to reveal more choices)
 
? where youre gonna clone it (owner/repo)  # Now you provide the destination of the cloned repo
                                           # for example MyOrg/Project2
```

Then it will prompt you for specific configurations of the repo

- Create the repo as public or private
- Generate automatically the ssh keys
- Generate the yml action file

When it's complete you will have some things to do that the script current cannot.

---

### Commit changes.
Enter the just created folder and commit the file .github folder with the changes, you can also add the `sshkey` and `sshkey.pub` into .gitignore.

---

### Add secrets
Add the secrets to your repository.

- SOURCE_REPO = `From where you have cloned {User/Org}/{RepoName}`
- TARGET_BRANCH = `usually main`
- SOURCE_REPO_SSH_PRIVATE_KEY = `Here you will put the content of the *sshkey* file`

---

### Add deploy key
In the repo you are cloning from you will have to add a deploy key, it will contain the value equivalent to the `sshkey.pub` file.

---

<!-- workflowstop -->
