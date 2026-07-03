const isPlainObject = require( '@stdlib/assert-is-plain-object' );

// Serialize an object (e.g. an HN comment tree) to a compact JSON-ish string
// for feeding to an LLM. Objects are flattened to arrays of their values and
// key quotes are dropped to save tokens, while string values are cleaned to
// readable plain text (HTML tags and entities removed, whitespace collapsed).
//
// NOTE: this deliberately does NOT strip stopwords, punctuation, or vowels.
// An earlier version did — a token-saving hack that turned comments into
// near-gibberish ("thnk mpressv bnchmrks") and badly degraded the discussion
// summaries. Modern context windows make that compression unnecessary and
// harmful, so the comment text is now passed through legibly.
function jsonSerializeCompressed( obj ) {
  let str = JSON.stringify( obj, ( key, value ) => {
    if ( isPlainObject( value ) ) {
      return Object.keys( value ).map( key => value[key] );
    }
    else if ( typeof value === 'string' ) {
      let out = value;

      // Remove HTML tags:
      out = out.replace( /<[^>]+>/g, ' ' );

      // Decode the HTML entities HN commonly emits, then drop any others:
      out = out
        .replace( /&#x2F;/gi, '/' )
        .replace( /&#x27;/gi, "'" )
        .replace( /&quot;/gi, '"' )
        .replace( /&amp;/gi, '&' )
        .replace( /&gt;/gi, '>' )
        .replace( /&lt;/gi, '<' )
        .replace( /&#\d+;/g, ' ' )
        .replace( /&[a-z]+;/gi, ' ' );

      // Collapse whitespace:
      out = out.replace( /\s+/g, ' ' ).trim();

      return out;
    }
    return value;
  });

  // Remove all quotes around keys:
  str = str.replace( /"([^"]+)":/g, '$1:' );
  return str;
}

module.exports = jsonSerializeCompressed;
