const md = require('markdown-it')();
const yaml = require('js-yaml');

let markdown_parser = function () {

  /**
   * Converts a markdown block with frontmatter (each is optional, technically) to a well-formed object.
   * @param block - the ".md" file, which can contain frontmatter or not, or only frontmatter.
   * @returns an object with any frontmatter keys, plus a .markdown key
     */
  function parseMarkdownBlock(block) {
    let returnObject = {};

    try {
      //for each block process the yaml frontmatter and markdown
      let frontmatterRE = /---\r?\n{1}([\s\S]*)---\r?\n{1}([\s\S]*)+/gm;
      let chunks = frontmatterRE.exec(block);

      if (chunks) {
        //we got some frontmatter
        if (chunks && chunks[1]) {
          //parse the yaml if we got it
          let frontmatter = chunks[1];
          returnObject = yaml.safeLoad(frontmatter);
        }

        if (chunks[2]) {
          //parse the actual markdown if it exists
          returnObject.markdown = md.render(chunks[2]);
          console.log('rendered markdown', returnObject.markdown);
        } else {
          returnObject.markdown = '';
        }
      } else {
        //assume the block was only markdown
        returnObject.markdown = md.render(block);
      }
    } catch (ex) {
      console.log(ex);
      console.log('error parsing markdown block', block);
      return undefined;
    }

    //return the frontmatter keys and markdown for a consumer to decide what to do with
    return returnObject;
  }

  return {
    parse: function (block) {
      return parseMarkdownBlock(block);
    }
  };

};

module.exports = markdown_parser;
