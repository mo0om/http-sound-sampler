import Ember from 'ember';

export default Ember.Controller.extend({
  actions: {
    pitched (val) {
      console.log(val)
      semitones = val
    }
  }
});
