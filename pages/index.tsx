import * as React from 'react';
import Head from 'next/head'
import styles from './index.module.css';
import {CopyToClipboard} from 'react-copy-to-clipboard';

interface Vote {
  time: string,
  token: string,
  vote: string,
}

interface State {
  tokens?: string[], // tokens.csv line-by-line
  votes?: Vote[], // results.csv line-by-line
  results?: string, // results message
}

class Copyable extends React.Component<{children: string}> {
  render() {
    const {children} = this.props;
    return (
      <CopyToClipboard text={children}>
        <code className="copieable">{children}</code>
      </CopyToClipboard>
    );
  }
}

const badGoogleFormMessage = "Detected more than a single question in the Google Form. \nIt says 'A vote is a single multiple choice question asked to all eligible alumni'. \nPlease go and evaluate the vote by hand and RTFM next time. \n";

export default class extends React.Component {
  state: State = {
    tokens: undefined,
    votes: undefined,
  };

  private handleTokenCSVUpload: React.ChangeEventHandler<HTMLInputElement> = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();

    const files = event.target.files;
    if (files.length !== 1) {
      this.setState({ tokens: undefined });
      return;
    }

    const text = await files[0].text();
    const tokens = text.split("\n").map(l => l.trim()).filter(s => s !== "");
    this.setState({ tokens }, this.handleEval);
  }

  private handleVoteCSVUpload: React.ChangeEventHandler<HTMLInputElement> = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();

    const files = event.target.files;
    if (files.length !== 1) {
      this.setState({ tokens: undefined });
      return;
    }

    const text = await files[0].text();
    const lines = text.split("\n").slice(1).map(l => l.trim()).filter(s => s !== "");
    let badResultsCSV = false;
    const votes = lines.map(l => {
      const [time, token, vote] = l.split(",");
      if (l.split(",").length != 3) {
        badResultsCSV = true;
      }
      return {time, token, vote};
    });

    if (badResultsCSV) {
      alert(badGoogleFormMessage);
      this.setState({results: badGoogleFormMessage});
      return;
    }

    this.setState({votes}, this.handleEval);
  }

  private handleEval = async () => {
    const {votes, tokens} = this.state;
    if (votes === undefined || tokens === undefined) {
      this.setState({results: undefined});
      return;
    }

    this.setState({results: this.doEvaluation(tokens, votes)});
  };

  private doEvaluation = (tokenArray: string[], voteArray: Array<Vote>): string => {
    console.log(voteArray);
    const log = new Array<string>();

    const tokens = new Set<string>();
    tokenArray.forEach(token => tokens.add(token));

    // collect what everyone voted for
    const votes = new Map<string, string>();
    voteArray.forEach(({time, token, vote: option}) => {
      if(!tokens.has(token)) {
        log.push(`Error: Invalid voting token ${token}`);
      }

      votes.set(token, option);
    });

    const totalCount = tokens.size; // total number of eligible voters (tokens)
    const voteCount = votes.size; // total number of votes used
    const abstainCount = totalCount - voteCount;

    // make a hashmap of votes
    const hashmap = new Map<string, number>();
    votes.forEach((option, token) => {
      console.log("got option", option);
      if (!hashmap.has(option)) {
        hashmap.set(option, 0);
      }
      hashmap.set(option, hashmap.get(option) + 1);
    })

    log.push("");
    log.push("Results:")

    // get a sorted list of results
    const results = Array.from(hashmap.entries()).sort((a, b) => a[1] - b[1]);
    results.forEach(([option, count]) => {
      log.push(`Option ${option}: ${count} ${(count / totalCount) * 100}%`);
    });

    log.push("");
    log.push(`${voteCount} Vote(s) / ${abstainCount} Abstain(s) / ${totalCount} Total`);

    // and join it all
    return log.join("\n");
  }


  render() {
    const { tokens, votes, results } = this.state;
    return (<>
      <Head><title>Portal Votes</title></Head>
      <h1>Portal Votes</h1>
      <p>
        This page runs you through running a vote using the Alumni Portal and evaluating the results. 
        A vote is a single multiple choice question asked to all eligible alumni. 
        Results will contain a list of selected answers and how many vote(s) it received. 
      </p>
      <p>
        Links on the page generally link to <Copyable>portal.jacobs-alumni.de</Copyable>. 
        When testing, use <Copyable>dev.portal.jacobs-alumni.de</Copyable> instead.
      </p>
      <p>
        Any data submitted on this page never leaves your browser.
        Anything on this page <Copyable>in green monospace</Copyable> can be copied to the clipboard by clicking on it. 
      </p>

      <h2>Step 1: Create a Google Form</h2>

      <ol>
        <li>
          Head to <a href="https://forms.google.com" target="_blank">Google Forms</a>.
        </li>
        <li>
          Ensure that you are logged in using your Alumni Account.
          If neccessary, switch to it using the Account Selector on the top right. 
        </li>
        <li>
          Create a new Google Form by clicking on <code>Blank</code>.
        </li>
        <li>
          Change the <code>Title</code> of the Form to the <code>Title</code> of the Vote. 
          Change the <code>Form Description</code> to a short description of what people are voting on. 
        </li>
        <li>
          Change the First Question to the Type <code>Short Answer</code>.
          In the <code>Question Description</code> enter <Copyable>What is your voting token? Find it on the portal. </Copyable>
          If a <code>Validation</code> Field appears, remove it. 
          Switch the <code>Required</code> Slider into the On State.
        </li>
        <li>
          Add a Second Question. This time it should be of the <code>Multiple Choice</code> Type.
          In the <code>Question Description</code> enter the Question that is being voted on.
          Add any options that the Voters can choose.
          Switch the <code>Required</code> Slider into the On State.
        </li>
      </ol>

      <h2>Step 2: Generate a pre-filled Google Forms link</h2>

      <ol>
        <li>
          On the Google Form you just created, click the <code>...</code> Icon on the top right and select <code>Get pre-filled link</code>.
        </li>
        <li>
          In the Page that opens fill out the voting token question with <Copyable>{"${token}"}</Copyable>.
        </li>
        <li>
          Do not fill out the other question.
        </li>
        <li>
          Click <code>Get Link</code> and then <code>Copy Link</code> in the resulting Notification. 
        </li>
      </ol>

      <h2>Step 3: Create a Vote Link</h2>

      <ol>
        <li>Login to the Portal and then head to <a href="https://portal.jacobs-alumni.de/admin/registry/votelink/" target="_blank">Django Admin</a>. </li>
        <li>Click on Add Vote Link</li>
        <li>Do not check the <code>Active</code> Field</li>
        <li>In the <code>Title</code> Field, enter the title of the vote. </li>
        <li>In the <code>Description</code> Field, enter a description of the vote. </li>
        <li>
          In the <code>URL</code>, paste the URL you generated above in <b>Step 2</b>. 
          It should end with <code>$%7Btoken%7D</code>. 
        </li>
        <li>
          Replace the end of the URL (<code>$%7Btoken%7D</code>) with <Copyable>{"${token}"}</Copyable>. 
        </li>
        <li>Click <code>Save</code> to save the vote. </li>
      </ol>

      <h2>Step 4: Open the Google Form and Vote</h2>

      <ol>
        <li>Wait until the time where voter(s) should be able to vote. </li>
        <li>On the Django Admin page, edit the <code>Vote Link</code> and make sure to select the <code>Active</code> Checkbox. Click <code>Save</code> to apply the changes. </li>
        <li>On the Google Form, click the <code>Responses</code> tab and ensure that <code>Accepting Responses</code> is enabled. </li>
        <li>Voter(s) can now see the vote in the voting page under <Copyable>https://portal.jacobs-alumni.de/portal/vote/</Copyable>. </li>
      </ol>

      <h2>Step 5: Close the Google Form and Disable the Vote Link</h2>

      <ol>
      <li>Wait until the time where voters should no longer be able to vote. </li>
        <li>On the Django Admin page, edit the <code>Vote Link</code> and make sure to deselect the <code>Active</code> Checkbox. Click <code>Save</code> to apply the changes. </li>
        <li>On the Google Form, click the <code>Responses</code> tab and ensure that <code>Accepting Responses</code> is disabled. </li>
        <li>Voting is now no longer possible. </li>
      </ol>

      <h2>Step 6: Retrieve the results and tokens from Google Forms and the Portal</h2>

      <ol>
        <li>
          On the Django Admin Page, open the <code>Vote Link</code> in question and click on <code>Export Tokens</code>.
          Save the file under the name <Copyable>tokens.csv</Copyable>.
        </li>
        <li>
          On the Google Form, click on the <code>Responses Tab</code> and on the <code>Spreadsheet Icon</code>. 
          Link the responses to a new Spreadsheet. 
        </li>
        <li>
          Export the <code>Google Form</code> as <code>Comma-seperated values</code> by clicking on <code>File</code>, then <code>Download</code>, then <code>Comma-seperated values (.csv)</code>. 
          Save the file under the name <Copyable>results.csv</Copyable>. 
        </li>
      </ol>

      <h2>Step 7: Select the downloaded the csv files</h2>
      <div>
        Select <code>tokens.csv</code> you created in Step 6: <input type="file" onChange={this.handleTokenCSVUpload}></input>
        { tokens !== undefined && <span className={styles.ok}>{tokens.length} token(s) loaded</span> }
      </div>

      <div>
        Select <code>results.csv</code> you created in Step 6: <input type="file" onChange={this.handleVoteCSVUpload}></input>
        { votes !== undefined && <span className={styles.ok}>{votes.length} vote(s) loaded</span> }
      </div>

      <h2>Step 8: View the Results</h2>
      <CopyToClipboard text={ results || ""}>
        <textarea readOnly className={styles.results} value={ results || ""} />
      </CopyToClipboard>
      <ul>
        <li>
          Click anywhere in the textarea to copy to clipboard.
        </li>
        <li>
          For Documentation Purposes, save the results and both csv files in a shared Google Drive Folder. 
        </li>
      </ul>

      <h2>Step 9: ???</h2>

      <h2>Step 10: Profit</h2>
    </>);
  }
}