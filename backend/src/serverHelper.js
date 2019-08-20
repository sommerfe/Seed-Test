const { exec } = require('child_process');
const fs = require('fs');
const { XMLHttpRequest } = require('xmlhttprequest');
const path = require('path');
const reporter = require('cucumber-html-reporter');
const mongo = require('./mongodatabase')

// this is needed for the html report
const options = {
  theme: 'bootstrap',
  jsonFile: 'features/reporting.json',
  output: 'features/reporting_html.html',
  reportSuiteAsScenarios: true,
  launchReport: true,
  metadata: {
    'App Version': '0.3.2',
    'Test Environment': 'STAGING',
    Browser: 'Chrome  54.0.2840.98',
    Platform: 'Windows 10',
    Parallel: 'Scenarios',
    Executed: 'Remote',
  },
};

const rootPath = path.normalize('features');

// only displays mid text and additional space if length not null
function midNotEmpty(values) {
  if (values.length === 0) {
    return '';
  }
  return `${values} `;
}

// adds content of each values to output
function getValues(values) {
  //TODO: TESTING HERE: excluding the first value
  let data = '';
  for (let i = 1; i < values.length; i++) {
    data += `"${values[i]}"`;
  }
  return data;
}

// adds label content to output TODO: might want to reuse this...
function getLabel(label) {
  return `"${label}"`;
}

// Content in Background for FeatureFile
function getBackgroundSteps(steps) {
  let data = '';
  for (let i = 0; i < steps.length; i++) {
    if (i === 0) {
      data += 'When ';
    } else {
      data += 'And ';
    }
    if (steps[i].values[0] != null) {
      data += `${steps[i].pre} "${steps[i].values[0]}" ${midNotEmpty(steps[i].mid)}${getValues(steps[i].values)} \n`;
    } else {
      data += `${steps[i].pre} ${midNotEmpty(steps[i].mid)}${getValues(steps[i].values)} \n`;
    }
  }
  data += '\n';
  return data;
}

// Building Background-Content
function getBackgroundContent(background) {
  let data = 'Background: \n\n';
  // get stepDefinitions
  data += getBackgroundSteps(background.stepDefinitions.when);
  return data;
}

// First letter in string to upper case
function jsUcfirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Building feature file step-content
function getSteps(steps, stepType) {
  // console.log(`Hi, ${stepType} \n ${steps}`);
  let data = '';
  for (let step of steps) {
    data += `${jsUcfirst(stepType)} `;
    // TODO: If Given contains Background (Background>0): Add Background (method)
    if ((step.values[0]) != null && (step.values[0]) !== 'User') {
      data += `${step.pre} "${step.values[0]}" ${midNotEmpty(step.mid)}${getValues(step.values)} \n`;
    } else if ((step.values[0]) === 'User') {
      data += `${step.pre} "${step.values[0]}"\n`;
    } else {
      data += `${step.pre} ${midNotEmpty(step.mid)}${getValues(step.values)} \n`;
    }
  }
  return data;
}

// adds content of each values to output
function getExamples(steps) {
  let data = 'Examples:';
  for (let i = 0; i < steps.length; i++) {
    data += '\n | ';
    for (let k = 0; k < steps[i].values.length; k++) {
      data += `${steps[i].values[k]} | `;
    }
  }

  return `${data}\n`;
}

// Building feature file scenario-name-content
function getScenarioContent(scenarios, storyID) {
  let data = '';
  for (let scenario of scenarios) {
    // console.log(`Scenario ID: ${scenario.scenario_id}`);
    data += `@${storyID}_${scenario.scenario_id}\n`;
    // if there are examples
    if ((scenario.stepDefinitions.example.length) > 0) {
      data += `Scenario Outline: ${scenario.name}\n\n`;
    } else {
      data += `Scenario: ${scenario.name}\n\n`;
    }
    // Get Stepdefinitions
    if (scenario.stepDefinitions.given != undefined) {
      data += `${getSteps(scenario.stepDefinitions.given, Object.keys(scenario.stepDefinitions)[0])}\n`;
    }
    if (scenario.stepDefinitions.when != undefined) {
      data += `${getSteps(scenario.stepDefinitions.when, Object.keys(scenario.stepDefinitions)[1])}\n`;
    }
    if (scenario.stepDefinitions.then != undefined) {
      data += `${getSteps(scenario.stepDefinitions.then, Object.keys(scenario.stepDefinitions)[2])}\n`;
    }

    if ((scenario.stepDefinitions.example.length) > 0) {
      data += `${getExamples(scenario.stepDefinitions.example)}\n\n`;
    }
  }
  return data;
}


// Building feature file story-name-content (feature file title)
function getFeatureContent(story) {
  let data = `Feature: ${story.title}\n\n`;

  // Get background
  if (story.background != null) {
    data += getBackgroundContent(story.background);
  }
  // Get scenarios
  data += getScenarioContent(story.scenarios, story.story_id);
  return data;
}

// Creates feature file
function writeFile(__dirname, selectedStory) {
  // console.log(`Hi, ${selectedStory.story_id}`);
  fs.writeFile(path.join(__dirname, 'features',
    `${selectedStory.title.replace(/ /g, '_')}.feature`), getFeatureContent(selectedStory), (err) => {
      if (err) throw err;
    });
}

function getStoryByID(params, stories) {
  let selectedStory;
  for (let story of stories) {
    if (story.story_id === parseInt(params.issueID)) {
      selectedStory = story;
      //   console.log(story.story_id);
      break;
    }
  }
  return selectedStory;
}

// Updates feature file based on story_id
function updateFeatureFiles(reqParams, stories) {
  let selectedStory;
  for (let i = 0; i < stories.length; i++) {
    if (stories[i].story_id == reqParams.issueID) {
      selectedStory = stories[i];
      break;
    }
  }
  if (selectedStory) {
    writeFile('', selectedStory);

  }
}

function execReport(req, res, stories, mode, callback) {
  const story = getStoryByID(req.params, stories);
  const path1 = 'node_modules/.bin/cucumber-js';
  const path2 = `features/${story.title.replace(/ /g, '_')}.feature`;
  const path3 = 'features/reporting.json';
  let cmd;
  if (mode === 'feature') {
    cmd = `${path.normalize(path1)} ${path.normalize(path2)} --format json:${path.normalize(path3)}`;
  } else {
    cmd = `${path.normalize(path1)} ${path.normalize(path2)} --tags "@${req.params.issueID}_${req.params.scenarioID}" --format json:${path.normalize(path3)}`;
  }
  console.log(`Executing: ${cmd}`);
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);

      callback();
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
    callback();
  });
}

function runReport(req, res, stories, mode) {
  execReport(req, res, stories, mode, () => {
    console.log(`testing ${mode} report`);
    reporter.generate(options);
    res.sendFile('/reporting_html.html', { root: rootPath });
  });
}

function sendDownloadResult(resp) {
  resp.sendFile('/reporting_html.html', { root: rootPath });
}

function getOwnRepositories(token, callback) {
  const request = new XMLHttpRequest();

  request.open('GET', 'https://api.github.com/user/repos', true, 'account_name', token);
  // get Issues from GitHub

  // request.setRequestHeader("Authorization", 'Basic 56cc02bcf1e3083f574d14138faa1ff0a6c7b9a1');
  request.send();
  request.onreadystatechange = function () {
    // console.log(
    // "readyState: " + this.readyState + " status: " + this.status +" "+ this.statusText)
    if (this.readyState === 4 && this.status === 200) {
      const data = JSON.parse(request.responseText);
      const names = [];
      let index = 0;
      for (const repo of data) {
        const repoName = repo.full_name;
        names[index] = repoName;
        index++;
      }
      callback(names);
      // console.log("getRepo: " + names)
    } else if (this.readyState === 4) {
      callback(null);
    }
  };
}

function getStarredRepositories(ghName, token, callback) {
  const request = new XMLHttpRequest();
  console.log(`githubname: ${ghName} token: ${token}`);
  request.open('GET', `https://api.github.com/users/${ghName}/starred`, true, ghName, token);
  // get Issues from GitHub

  // request.setRequestHeader("Authorization", 'Basic 56cc02bcf1e3083f574d14138faa1ff0a6c7b9a1');
  request.send();
  request.onreadystatechange = function () {
    // console.log("readyState: " + this.readyState + " status: " + this.status +" "+ this.statusText)
    if (this.readyState === 4 && this.status === 200) {
      const data = JSON.parse(request.responseText);
      const names = [];
      let index = 0;
      for (const repo of data) {
        const repoName = repo.full_name;
        names[index] = repoName;
        index++;
      }
      // console.log("getStarred: " + names);
      callback(names);
    } else if (this.readyState === 4) {
      callback(null);
    }
  };
}

function fuseGitWithDb(story, issueId) {
  return new Promise((resolve) => {
    mongo.getOneStory(issueId, function (result) {
      if (result !== null) {
        story.scenarios = result.scenarios;
        story.background = result.background;
      } else {
        story.scenarios = [emptyScenario()];
        story.background = emptyBackground();
      }
      mongo.upsertEntry("stories", story.story_id, story);
      writeFile('', story);  // Create & Update Feature Files
      resolve(story);
      // TODO: delete stories and save some storage
    })
  })
}

module.exports = {
  updateFeatureFiles,
  writeFile,
  runReport,
  sendDownloadResult,
  getStarredRepositories,
  getOwnRepositories,
  fuseGitWithDb
};
