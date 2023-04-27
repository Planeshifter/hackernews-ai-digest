## AI Submissions for Tue Apr 25 2023 {{ 'date': '2023-04-25T15:39:53.181Z' }}

### Transformers from Scratch

#### [Submission URL](https://e2eml.school/transformers.html) | 341 points | by [jasim](https://news.ycombinator.com/user?id=jasim) | [28 comments](https://news.ycombinator.com/item?id=35697627)

Transformers are all about sequence transduction, we need a way to convert words to numbers so we can do math on them. One approach is to count each word from one and assign it a number, but there's an easier format for computers to work with: one-hot encoding. This assigns each word an array of mostly zeroes with a single one in its corresponding index. This allows us to compute dot products and is used in matrix multiplication, a way to combine two-dimensional arrays. Markov chains, represented as matrices, can be used as a first order model to show what the next word is likely to be based on recent words.

The submission discusses the use of one-hot encoding to convert words to numbers for mathematical operations. It is suggested that the use of matrices, such as Markov chains, can help predict the next likely word based on the sequence. The comments provide links to additional resources, such as Jay Alammar's Illustrated Transformer series and TensorFlow implementation, and discuss various aspects of tokenization, embeddings, and projections. Some users express disappointment in the complexity of the topic while others provide beginner-friendly resources for understanding it. Two comments are flagged as possibly inappropriate.

### Tuql: Automatically create a GraphQL server from a SQLite database

#### [Submission URL](https://github.com/bradleyboy/tuql) | 20 points | by [thunderbong](https://news.ycombinator.com/user?id=thunderbong) | [8 comments](https://news.ycombinator.com/item?id=35699017)

Tuql is a new tool that can convert a SQLite database into a GraphQL endpoint. With its ability to infer relationships between objects, Tuql currently supports `belongsTo`, `hasMany`, and `belongsToMany` relationships. The tool also generates the necessary mutations to create, update, and delete objects and can associate many-to-many relationships. Tuql can be used through the command line and is available as an npm package.

The comments on the submission mention that Tuql is a great tool, and some users mention other similar libraries. One user points out that Tuql does not add threat fields for queries, which may make it difficult to change the frontend in the future. Another user recommends not using Tuql in production. There is also a discussion around how GraphQL frameworks handle authorization and security. Overall, most of the comments are positive, with users praising the convenience of Tuql and GraphQL libraries in general.

### Show HN: ChatGPT on 2-Dimensional Map

#### [Submission URL](https://www.superusapp.com/chatgpt2d/) | 147 points | by [victorsup](https://news.ycombinator.com/user?id=victorsup) | [55 comments](https://news.ycombinator.com/item?id=35709088)

On Hacker News, a developer has created an interesting web app called "ChatGPT on 2-Dimensional Map." The app combines two popular AI technologies, namely GPT-2 for natural language processing and t-SNE for dimensionality reduction, to create a chatbot that can navigate a 2D map based on user inputs. The developer has also provided a demo, so users can see the app in action. This innovative project showcases the potential of combining different AI tools to develop new and creative applications.

A developer has created a web app called "ChatGPT on 2-Dimensional Map," utilizing both the natural language processing capabilities of GPT-2 and t-SNE for dimensionality reduction to create a chatbot that can navigate a 2D map based on user inputs. The discussion shows appreciation for this innovative project and its demonstration of the potential of combining AI tools to develop new applications. Some users express interest in using this technology for research and performance modeling, while others suggest similar projects and libraries for visualization and mapping. Some discuss related concepts such as Mind Maps and Lie Algebra. The high cost of ConceptGPT is mentioned, and some users suggest alternatives or that the creator should have asked for a funding request. A few users also mention indulging in activities such as drinking while programming or creating AI, while others make fun of misconceptions around Pina Coladas and canned ingredients.

### Google Authenticator cloud sync: Google can see the secrets, even while stored

#### [Submission URL](https://defcon.social/@mysk/110262313275622023) | 349 points | by [Signez](https://news.ycombinator.com/user?id=Signez) | [117 comments](https://news.ycombinator.com/item?id=35708869)

The discussion revolves around the security of Google Account 2FA secrets and how well Google protects its user data. Some commenters question Google's willingness to share user data with governments, while others suggest ways to enhance the security of the 2FA system and protect against data breaches. The conversation also touches on Apple's adherence to user privacy in comparison to Google. The debate ultimately boils down to how much responsibility users should take to protect their own privacy and how much they should rely on their service providers. One user recommends a phone security service called 2FAS for added security.