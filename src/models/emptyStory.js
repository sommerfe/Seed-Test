function emptyStory() {
  return {
    story_id: '',
    scenarios: [
      {
        scenario_id: 1,
        name: '',
        stepDefinitions: [
          {
            given: [],
            when: [],
            then: []
          }]
      }]
  }
}
module.exports = emptyStory;
