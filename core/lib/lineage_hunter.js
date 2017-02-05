const extend = require("util")._extend;

let lineage_hunter = function () {

  let pa = require('./pattern_assembler');

  function findlineage(pattern, patternlab) {
    // As we are adding edges from pattern to ancestor patterns, ensure it is known to the graph
    patternlab.graph.add(pattern);

    let pattern_assembler = new pa();

    //find the {{> template-name }} within patterns
    let matches = pattern.findPartials();
    if (matches !== null) {
      matches.forEach(function (match) {
        //get the ancestorPattern
        let ancestorPattern = pattern_assembler.getPartial(pattern.findPartial(match), patternlab);

        if (ancestorPattern && pattern.lineageIndex.indexOf(ancestorPattern.patternPartial) === -1) {
          //add it since it didnt exist
          pattern.lineageIndex.push(ancestorPattern.patternPartial);

          //create the more complex patternLineage object too
          let l = {
            "lineagePattern": ancestorPattern.patternPartial,
            "lineagePath": "../../patterns/" + ancestorPattern.patternLink
          };
          if (ancestorPattern.patternState) {
            l.lineageState = ancestorPattern.patternState;
          }

          patternlab.graph.add(ancestorPattern);

          // Confusing: pattern includes "ancestorPattern", not the other way round
          patternlab.graph.link(pattern, ancestorPattern);

          pattern.lineage.push(l);

          //also, add the lineageR entry if it doesn't exist
          if (ancestorPattern.lineageRIndex.indexOf(pattern.patternPartial) === -1) {
            ancestorPattern.lineageRIndex.push(pattern.patternPartial);

            //create the more complex patternLineage object in reverse
            let lr = {
              "lineagePattern": pattern.patternPartial,
              "lineagePath": "../../patterns/" + pattern.patternLink
            };
            if (pattern.patternState) {
              lr.lineageState = pattern.patternState;
            }

            ancestorPattern.lineageR.push(lr);
            extend(patternlab.graph.node(ancestorPattern), lr);
          }
        }
      });
    }
  }

  /**
   * Apply the target pattern state either to any predecessors or successors of the given
   * pattern in the pattern graph.
   * @param direction Either 'fromPast' or 'fromFuture'
   * @param pattern {Pattern}
   * @param targetPattern {Pattern}
   * @param graph {PatternGraph}
   */
  function setPatternState(direction, pattern, targetPattern, graph) {
    let index = null;
    if (direction === 'fromPast') {
      index = graph.lineage(pattern);
    } else {
      index = graph.lineageR(pattern);
    }

    // if the request came from the past, apply target pattern state to current pattern lineage
    for (let i = 0; i < index.length; i++) {
      if (index[i].patternPartial === targetPattern.patternPartial) {
        index[i].lineageState = targetPattern.patternState;
      }
    }
  }


  function cascadePatternStates(patternlab) {

    for (let i = 0; i < patternlab.patterns.length; i++) {
      let pattern = patternlab.patterns[i];

      //for each pattern with a defined state
      if (pattern.patternState) {
        let lineage = patternlab.graph.lineage(pattern);

        if (lineage && lineage.length > 0) {

          //find all lineage - patterns being consumed by this one
          for (let h = 0; h < lineage.length; h++) {
            // Not needed, the graph already knows the concrete pattern
            // let lineagePattern = pattern_assembler.getPartial(lineageIndex[h], patternlab);
            setPatternState('fromFuture', lineage[h], pattern, patternlab.graph);
          }
        }
        let lineageR = patternlab.graph.lineageR(pattern);
        if (lineageR && lineageR.length > 0) {

          //find all reverse lineage - that is, patterns consuming this one
          for (let j = 0; j < lineageR.length; j++) {

            let lineageRPattern = lineageR[j];

            //only set patternState if pattern.patternState "is less than" the lineageRPattern.patternstate
            //or if lineageRPattern.patternstate (the consuming pattern) does not have a state
            //this makes patternlab apply the lowest common ancestor denominator
            let patternStateCascade = patternlab.config.patternStateCascade;
            let patternStateIndex = patternStateCascade.indexOf(pattern.patternState);
            let patternReverseStateIndex = patternStateCascade.indexOf(lineageRPattern.patternState);
            if (lineageRPattern.patternState === '' || (patternStateIndex < patternReverseStateIndex)) {

              if (patternlab.config.debug) {
                console.log('Found a lower common denominator pattern state: ' + pattern.patternState + ' on ' + pattern.patternPartial + '. Setting reverse lineage pattern ' + lineageRPattern.patternPartial + ' from ' + (lineageRPattern.patternState === '' ? '<<blank>>' : lineageRPattern.patternState));
              }

              lineageRPattern.patternState = pattern.patternState;

              //take this opportunity to overwrite the lineageRPattern's lineage state too
              setPatternState('fromPast', lineageRPattern, pattern, patternlab.graph);
            } else {
              setPatternState('fromPast', pattern, lineageRPattern, patternlab.graph);
            }
          }
        }
      }
    }
  }

  return {
    find_lineage: function (pattern, patternlab) {
      findlineage(pattern, patternlab);
    },
    cascade_pattern_states : function (patternlab) {
      cascadePatternStates(patternlab);
    }
  };
};

module.exports = lineage_hunter;
