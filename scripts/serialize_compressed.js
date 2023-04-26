const stopwords = require( '@stdlib/datasets-stopwords-en' );
const removeWords = require( '@stdlib/string-remove-words' );
const removePunctuation = require( '@stdlib/string-remove-punctuation' );
const isPlainObject = require( '@stdlib/assert-is-plain-object' );
const list = stopwords();

function jsonSerializeCompressed( obj ) {
  let str = JSON.stringify( obj, ( key, value ) => {
    if ( isPlainObject( value ) ) {
      return Object.keys( value ).map( key => value[key] );
    }
    else if ( typeof value === 'string' ) {
      let out = removeWords( value, list, true );
      
      // Remove HTML tags:
      out = out.replace(/(<([^>]+)>)/gi, "");
      
      // Remove non-ASCII characters:
      out = out.replace(/[^\x00-\x7F]/g, "");
      
      // Remove all  HTML character entities:
      out = out.replace(/&.*?;/g, "");
      
      out = removePunctuation( out );
      
      // Remove all vowels from non-capitalized words:
      out = out.replace(/\b([a-z]+?)\b/g, function( word ) {
        return word.replace(/[aeiou]/gi, '');
      });
      
      // Remove extra whitespace:
      out = out.replace(/\s+/g,' ').trim();
      
      return out;
    } 
    return value;
  });

  // Remove all quotes around keys:
  str = str.replace(/"([^"]+)":/g, '$1:');
  return str;
}

module.exports = jsonSerializeCompressed;
