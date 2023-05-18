import GPTAPIclient from "./GPTAPIclient/gptapiclient";
import { getRandomQuip } from "./errorPlaceholders";
console.log('background script has loaded');

const gptclient = new GPTAPIclient();


chrome.runtime.onMessage.addListener((msg, sender, response) => {
    console.log("background got message")
    switch (msg.type) {
        case 'getFeedback':
            getFeedback(msg.persona, msg.domSummary).then(reply=>{
                response(reply);
            }).catch(e => {
                console.log(e)
                response(getRandomQuip())
            })
            
            break;
        default:
            response('unknown request');
            break;
    }
});
 function getGptMessage(role, content){
    return {
        role, 
        content
    }
 }
  function getSystemMessage(persona = "Steve Jobs", domSummary){ 
    return getGptMessage("system", `
        You are generating UI/UX insights.
        You never reply with pre-text or post-text.
    `)
}
    function getFeedbackUserMessage(persona = "Steve Jobs", domSummary){
        getGptMessage("user", `
    Generate a quip based on the bare-bones layout of this website, 
    using the persona's perspective.

    Consider the fact the skeleton is incomplete and try to infer the missing content when generating the quip.
    You should reply with only the quip, no quotes, pretext, or posttext 
    `)
    }

async function getFeedback(persona, domSummary){
    console.log(`getting feedback on ${domSummary} `)
    const systemMessage = getSystemMessage(persona, domSummary)
    const chainOfThoughtMessage = getChainOfThoughtMessage(persona, domSummary)
   const personaThoughtReply = await gptclient.request([
    systemMessage,
    chainOfThoughtMessage
   ],'gpt-3.5-turbo')
   console.log("initial thought: "+personaThoughtReply)
   const finalQuip = await gptclient.request([
    systemMessage,
    getGptMessage("user","Describe the website and how a user is likely to feel about it"),
    getGptMessage("assistant", "I would describe it and the user as"+personaThoughtReply + "\n Going forward I will ensure I do not reply with posttext or pretext, and encorporate this feedback, even if it means using vulgarity or emojis."),
    getFinalQuipMessage(persona, domSummary)
   ],'gpt-4')
   console.log("final thought: "+finalQuip)
   return finalQuip
}
function getFinalQuipMessage(persona = "Steve Jobs", domSummary){return getGptMessage("user", `

    You are roleplaying as ${persona}. 
    Produce a quip that represents the persona replying extremely candidly.
    Use the previously established likeihoods and description to determine how you reply.

    Make sure you account for the fact that the description is incomplete: do not comment on a lack of information as you were given as much as possible.

    You must reply in the intonation and perplexity of this person.
    You must reply with no pretext or posttext, and no quotes.
    We realize that the persona is replying so you should feel free to be as rude or volatile as possible
    `)
}

function getChainOfThoughtMessage(persona = "Steve Jobs", domSummary){return getGptMessage("user", `
    Imagine that someone is looking at a website.
    The website has the following clickable items:
    '''
    ${domSummary}
    '''
    Based on this incomplete skeleton, write a terse technical paragraph that describes what the likey
     general layout of the site they're looking at is. 
     Imagine general top level components, the color and aesthetic, etc.
     The paragraph should be written as if a programmer is trying to describe the high level description of the page by imaginging everything not described.
     Assume it is ok if you are completely wrong

    Then conclude with the following list in JSON:
    Likeyhood of liking site: 0-100
    Likeyhood of hating site: 0-100
    Likeyhood of being confused by site: 0-100
    Likeyhood of using an emoji in reply: 0-100
    Likeyhood of vulgarity: 0-100
    Likeyhood of excitedness: 0-100
    Perplexity: 0-100
    `)
}