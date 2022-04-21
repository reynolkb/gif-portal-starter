import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import React, { useEffect, useState } from 'react';
import { Buffer } from 'buffer';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import idl from './idl.json';
import kp from './keypair.json';

const { SystemProgram, Keypair } = web3;
// base account that will store gif data
window.Buffer = Buffer;

// we're generating a new account each time. we need one keypair all the users share
// let baseAccount = Keypair.generate();

const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl('devnet');

const opts = {
	// choose how long we want to wait for the transaction, do we want to wait for one computer or all? processed is our computer
	// finalized
	preflightCommitment: 'processed',
};

// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const TEST_GIFS = [
	'https://i.pinimg.com/originals/1d/73/ba/1d73ba60d876635574f4254255892560.gif',
	'https://media.giphy.com/media/gxxlowyvtfS0M/giphy.gif',
	'https://media.giphy.com/media/26DN3US3zaEJ5WZtC/giphy-downsized-large.gif',
];

const App = () => {
	const [walletAddress, setWalletAddress] = useState(null);
	const [inputValue, setInputValue] = useState('');
	const [gifList, setGifList] = useState([]);

	const checkIfWalletIsConnected = async () => {
		try {
			const { solana } = window;
			return new Promise((resolve, reject) => {
				if (solana) {
					if (solana.isPhantom) {
						setTimeout(async () => {
							console.log('Phantom wallet found!');
							// only set to response if the user have given permission to the website from their phantom wallet
							try {
								const response = await solana.connect({ onlyIfTrusted: true });
								console.log('Connected with Public Key:' + response.publicKey.toString());
								setWalletAddress(response.publicKey.toString());
								resolve();
							} catch (error) {
								console.error(error);
							}
						}, 2000);
					}
				} else {
					alert('Solana object not found! Get a Phantom wallet!');
					reject();
				}
			});
		} catch (error) {
			console.error(error);
		}
	};

	const connectWallet = async () => {
		const { solana } = window;
		if (solana) {
			const response = await solana.connect();
			console.log('Connected with Public Key:', response.publicKey.toString());
			setWalletAddress(response.publicKey.toString());
		}
	};

	const sendGif = async () => {
		if (inputValue.length > 0) {
			console.log('Gif link:', inputValue);
			try {
				const provider = getProvider();
				const program = new Program(idl, programID, provider);
				await program.rpc.addGif(inputValue, {
					accounts: {
						baseAccount: baseAccount.publicKey,
						user: provider.wallet.publicKey,
					},
				});
				console.log('GIF successfully sent to program', inputValue);
				await getGifList();
				setInputValue('');
			} catch (err) {
				console.error(err);
			}
		} else {
			console.log('Empty input. Try again.');
		}
	};

	const onInputChange = (event) => {
		const { value } = event.target;
		setInputValue(value);
	};

	const getProvider = () => {
		const connection = new Connection(network, opts.preflightCommitment);
		const provider = new Provider(connection, window.solana, opts.preflightCommitment);
		return provider;
	};

	const createGifAccount = async () => {
		try {
			const provider = getProvider();
			const program = new Program(idl, programID, provider);
			await program.rpc.startStuffOff({
				accounts: {
					baseAccount: baseAccount.publicKey,
					user: provider.wallet.publicKey,
					systemProgram: SystemProgram.programId,
				},
				signers: [baseAccount],
			});
			console.log('Created a new BaseAccount w/ address:', baseAccount.publicKey.toString());
			await getGifList();
		} catch (err) {
			console.error(err);
		}
	};

	// cannot use async
	const renderNotConnectedContainer = () => {
		return (
			<button className='cta-button connect-wallet-button' onClick={connectWallet}>
				Connect to Wallet
			</button>
		);
	};

	const renderConnectedContainer = () => {
		// baseAcocunt is null and we haven't created a gifList
		if (gifList === null) {
			return (
				<div className='connected-container'>
					<button className='cta-button submit-gif-button' onClick={createGifAccount}>
						Do One-Time Initialization for GIF Program Account
					</button>
				</div>
			);
		} else {
			return (
				<div className='connected-container'>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							sendGif();
						}}>
						<input type='text' placeholder='Enter gif link!' value={inputValue} onChange={onInputChange} />
						<button type='submit' className='cta-button submit-gif-button'>
							Submit
						</button>
					</form>
					<div className='gif-grid'>
						{gifList.map((item, index) => {
							return (
								<div className='gif-item' key={index}>
									<img src={item.gifLink} alt={item.gifLink} />
								</div>
							);
						})}
					</div>
				</div>
			);
		}
	};

	useEffect(() => {
		const onLoad = async () => {
			console.log('pre check');
			await checkIfWalletIsConnected();
			console.log('post check');
		};
		window.addEventListener('load', onLoad);
		// close page remove event listener
		return () => window.removeEventListener('load', onLoad);
		// no variable inside of [], component is called only when component mounts
	}, []);

	const getGifList = async () => {
		try {
			const provider = getProvider();
			const program = new Program(idl, programID, provider);
			const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

			console.log('Got the account', account);
			setGifList(account.gifList);
		} catch (err) {
			console.error(err);
			setGifList(null);
		}
	};

	useEffect(() => {
		if (walletAddress) {
			console.log('Fetching GIF list...');
			getGifList();
		}
	}, [walletAddress]);

	return (
		<div className='App'>
			<div className={walletAddress ? 'authed-container' : 'container'}>
				<div className='header-container'>
					<p className='header'>🖼 GIF Portal</p>
					<p className='sub-text'>View your GIF collection in the metaverse ✨</p>
					{!walletAddress && renderNotConnectedContainer()}
					{walletAddress && renderConnectedContainer()}
				</div>
				<div className='footer-container'>
					<img alt='Twitter Logo' className='twitter-logo' src={twitterLogo} />
					<a className='footer-text' href={TWITTER_LINK} target='_blank' rel='noreferrer'>{`built on @${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
};

export default App;
