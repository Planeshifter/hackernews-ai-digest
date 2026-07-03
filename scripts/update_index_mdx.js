const path = require('path');
const fs = require('fs');

/**
* Escapes characters that MDX would otherwise interpret as JSX or expression
* syntax, so that raw digest prose (e.g. "typically <30" or "a { b") does not
* break the MDX build.
*
* Content inside inline code spans (`...`) and fenced code blocks (```...```)
* is left untouched, since `<` and `{` are already literal there. Genuine
* HTML/JSX tags (`<div>`, `</p>`, `<>`, `<!-- -->`) and the intentional
* `{{ 'date': ... }}` metadata expressions are preserved as well.
*
* @param {string} text - raw digest markdown
* @returns {string} MDX-safe markdown
*/
function sanitizeForMDX( text ) {
    // Split out fenced code blocks so their contents are preserved verbatim
    // (odd-indexed segments are the code fences):
    return text.split( /(```[\s\S]*?```)/g ).map( ( block, blockIdx ) => {
        if ( blockIdx % 2 === 1 ) {
            return block;
        }
        // Split out inline code spans, likewise preserved verbatim:
        return block.split( /(`[^`]*`)/g ).map( ( seg, segIdx ) => {
            if ( segIdx % 2 === 1 ) {
                return seg;
            }
            // Escape `<` only when it cannot start a valid tag name (i.e. it is
            // not followed by a letter, `$`, `_`, `/`, `!`, or `>`); this fixes
            // cases like `<30` while leaving real tags and fragments intact:
            seg = seg.replace( /<(?![A-Za-z$_/!>])/g, '&lt;' );
            // Escape lone `{` (which would open an MDX expression) while
            // preserving intentional `{{ ... }}` metadata expressions:
            seg = seg.replace( /\{\{[\s\S]*?\}\}|\{/g, match => {
                return match.length > 1 ? match : '&#123;';
            });
            return seg;
        }).join( '' );
    }).join( '' );
}

// Get digest files from the data directory:
let digests = fs
    .readdirSync( path.join( __dirname, '..', 'data' ) )
    .filter( filename => filename.startsWith( 'digest_' ) );

// Sort digests by date in descending order:
digests.sort( ( a, b ) => {
    const aDate = new Date( a.replace( 'digest_', '' ).replace( '.md', '' ) );
    const bDate = new Date( b.replace( 'digest_', '' ).replace( '.md', '' ) );
    return bDate - aDate;
});
digests = digests.slice( 0, 3 );

let digestTexts = '';
for ( let i = 0; i < digests.length; i++ ) {
    const digest = digests[i];
    const text = fs.readFileSync( path.join( __dirname, '..', 'data', digest ), 'utf8' );
    digestTexts += sanitizeForMDX( text.trim() );
    if ( i < digests.length - 1 ) {
        digestTexts += '\n\n---\n\n';
    }
}

let indexMDX = fs.readFileSync( path.join( __dirname, 'templates', 'index.mdx' ), 'utf8' );
indexMDX = indexMDX.replace( '{{digests}}', digestTexts );

fs.writeFileSync( path.join( __dirname, '..', 'www', 'src', 'pages', 'index.mdx' ), indexMDX, 'utf8' );
