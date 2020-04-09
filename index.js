#!/usr/bin/env node

const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const files = require('./lib/files');
const inquirer = require('./lib/inquirer');
const util = require('./util');
const ora = require('ora');
const gtranslate = require('google-translate-api');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

clear();

console.log(
  chalk.yellow(
    figlet.textSync('PoTrans', { horizontalLayout: 'full' })
  )
);

const run = async () => {
  const spinner = ora({
    text: chalk.blueBright('Translating'),
    color: 'blue',
  });

  try {
    //Initialization
    const initialData = util.parseInitialData(process.argv);

    var data = await inquirer.askConfiguration(initialData);

    //Normalization
    if (!data.defaultPath) {
      data.defaultPath = initialData.defaultPath;
    }
    if (!data.inputLanguage) {
      data.inputLanguage = initialData.inputLanguage;
    }
    if (!data.outputLanguage) {
      data.outputLanguage = initialData.outputLanguage;
    }

    var strings = files.getStrings(data.defaultPath);
    const total = strings.filter(str => str.string.length == 0).length;

    //Translating
    console.log("");
    spinner.start();

    //Writing
    var _count = 0;
    var _indexs = new Array(total);
    _indexs.fill(false);

    translated_strings = strings.map((string, index) => {
      if (string.string.length == 0) {
        ++_count;
        gtranslate(string.id, {
            from: data.inputLanguage,
            to: data.outputLanguage
          }).then(res => {
            string.string = res.text;
            _indexs[index] = true;
            spinner.start("translated: " + _indexs.filter(v => v == true).length + "/" + total);
        }).catch(err => {
          console.log(err);
        });
      }

      return string;
    });

    while (_indexs.filter(v => v == true).length < total) {
      await sleep(1000);
    }

	  spinner.succeed("Translated");
    console.log("");

    var outputPath = util.outputPathFromInputPath(data.defaultPath, data.outputLanguage);
    if (files.fileExists(outputPath)) {
      const overwrite = await inquirer.askOutputFile();

      if (overwrite.outputPath)
        outputPath = overwrite.outputPath;
    }

    console.log("");
    spinner.start("Writing file");
    
    files.writeStrings(outputPath, translated_strings);

    spinner.succeed("Operations completed");
  }
  catch (err) {
    spinner.stop();
    console.log("\n" + chalk.redBright(err));
    process.exit(1);
  }
};

run();