import Ember from 'ember';

export default Ember.Controller.extend({
  // == Dependencies ==========================================================

  // == Properties ============================================================

  context: null,
  beep: null,
  analyser: null,
  bufferLength: null,
  dataArray: null,
  svg: null,
  d3Width: 600,
  d3Height: 300,

  // == Computed Properties ===================================================

  // == Functions =============================================================

  init () {
    this._super (...arguments)
    let that = this
    Ember.run.schedule('afterRender', this, function () {
      this.set('allSources', [])
      this.set('semitones', 0)
      this.set('ls', 0)
      this.set('le', 100)
      this.set('context', new AudioContext())
      this.set('analyser', this.get('context').createAnalyser())
      this.set('analyser.fftSize', 2048)
      this.set('bufferLength', this.get('analyser.frequencyBinCount'))
      this.set('dataArray', new Uint8Array(this.get('bufferLength')))
      this.loadDogSound('/audio/beep.wav')
      let d3Canvas = d3.select('#d3-canvas')
        .append('svg')
        .attr('width', that.get('d3Width') + 'px')
        .attr('height', that.get('d3Height') + 'px')
      this.set('svg', d3Canvas)
    })
  },

  loadDogSound: function (url) {
    let that = this
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // Decode asynchronously
    request.onload = function() {
      let context = that.get('context')
      context.decodeAudioData(request.response, function(buffer) {
        that.set('beep', buffer)
        // displayBuffer(buffer);

        that.drawD3(buffer);
      }, that.onError);
    }
    request.send();
  },

  onError: function (e) {
    console.log(e)
  },

  drawD3: function (buffer) {
    let that = this
    var lc = buffer.getChannelData(0);

    var x = d3.scaleLinear().range([0, that.get('d3Width')]);
    var y = d3.scaleLinear().range([that.get('d3Height'), 0]);

  // Define the line
    var valueline = d3.line()
      .x(function(d, i) { return x(i); })
      .y(function(d) { return y(d); });

  // Scale the range of the data
    x.domain(d3.extent(lc, function(d, i) { return i; }));
    y.domain([-1, 1]);

    // Add the valueline path.
    let svg = this.get('svg')
    svg.append("path")
      .attr("class", "line")
      .attr("d", valueline(lc));

    d3.select(".axis .x-axis")
      .call(d3.axisBottom(x));
    d3.select(".axis .y-axis")
      .call(d3.axisLeft(y));

    // brush
    svg.append("g")
      .attr("class", "brush")
      .call(d3.brushX()
        .extent([[0, 0], [that.get('d3Width'), that.get('d3Height')]])
        .on("end", brushended));
    function brushended() {
      if (!d3.event.sourceEvent) return; // Only transition after input.
      if (!d3.event.selection) return; // Ignore empty selections.

      that.set('ls', 100 * d3.event.selection[0] / that.get('d3Width'))
      that.set('le', 100 * d3.event.selection[1] / that.get('d3Height'))
      var source = that.createSource()
      source.source.connect(that.get('analyser'))
    }
  },

  createSource: function (loop) {
    let beep = this.get('beep')
    console.log('buffer', beep);
    let loopStartVal = beep.duration * this.get('ls') / 100;
    let loopEndVal = beep.duration * this.get('le') / 100;
    let source = this.get('context').createBufferSource(); // creates a sound source
    source.buffer = beep;                    // tell the source which sound to play
    let semitoneRatio = Math.pow(2, 1/12);
    source.loop = loop ? true : false;
    source.loopStart = loopStartVal;
    source.loopEnd = loopEndVal;
    source.playbackRate.value = Math.pow(semitoneRatio, this.get('semitones'))
    return {
      source: source,
      loopStartVal: loopStartVal
    }
  },

  // == Events ================================================================

  // == Actions ===============================================================

  actions: {
    pitched (val) {
      console.log(val)
      if (val > -1) {
        this.set('semitones', -Math.abs(val))
      } else {
        this.set('semitones', Math.abs(val))
      }

    },
    playSound: function () {
      var source = this.createSource(true);
      source.source.connect(this.get('context').destination);       // connect the source to the context's destination (the speakers)
      source.source.start(0, source.loopStartVal);
      this.get('allSources').push(source.source)
      // note: on older systems, may have to use deprecated noteOn(time);
    },
    stop: function () {
      this.get('allSources').forEach(function (aSource) {
        aSource.stop()
      })
    }
  }
});
