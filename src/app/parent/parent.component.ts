import { Component, OnInit } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { RepositoryContainer } from '../model/RepositoryContainer';
import { Router, ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-parent',
  templateUrl: './parent.component.html',
  styleUrls: ['./parent.component.css']
})
export class ParentComponent implements OnInit {

  stories: Story[];
  selectedStory: Story;
  selectedScenario: Scenario;
  formtosubmit: [""];
  repository: RepositoryContainer;

  constructor(public apiService: ApiService, public route: ActivatedRoute) {
    this.route.params.subscribe(params => {
      console.log('params', params);
        let value: string = params.value;
        let source: string = params.source;
        this.repository = {value, source};
        if(this.apiService.urlReceived) {
          this.loadStories();
        }else {
          this.apiService.getBackendInfo()
        }
    });
    this.apiService.getBackendUrlEvent.subscribe(() => {
      this.loadStories();
    });
    if(this.apiService.urlReceived) {
      this.loadStories();
    }else {
      this.apiService.getBackendInfo()
    }
   }

  ngOnInit() {
    console.log('on nginit in parent')
    this.apiService.getRepositories().subscribe();
  }

  loadStories() {
    if (this.repository.source === 'github') {
      this.apiService
          .getStories(this.repository)
          .subscribe((resp: Story[]) => {
            this.stories = resp;
          });
    } else {
      this.apiService
          .getIssuesFromJira(localStorage.getItem('jiraKey'))
          .subscribe((resp: Story[]) => {
            this.stories = resp;
            console.log('Jira Response');
            console.log(resp);
          });
    }
  }

  setSelectedStory(story: Story){
    this.selectedStory = story;
  }

  setSelectedScenario(scenario: Scenario){
    this.selectedScenario = scenario;
  }

}
