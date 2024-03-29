import 'dotenv/config';
import 'reflect-metadata';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { createConnection } from 'typeorm';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { UserResolver } from './UserResolvers';
import { verify } from 'jsonwebtoken';
// import { ApolloLink } from "apollo-link";
// import {createConnection} from "typeorm";
import { User } from './entity/User';
import { createRefreshToken, createAccessToken } from './auth';
import { sendRefreshToken } from './sendRefreshToken';

(async () => {
	const app = express();

	app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
	app.use(cookieParser());

	app.get('/', (_req, res) => {
		res.send('Hello from root!');
	});

	app.post('/refresh_token', async (req, res) => {
		// Read cookie from request
		const token = req.cookies.jid;

		if (!token) {
			return res.send({ ok: false, accessToken: '' });
		}

		let payload: any = null;

		try {
			// Make sure that token is signed by our key and that it has not expired
			payload = verify(token, process.env.REFRESH_TOKEN_SECRET!);
		} catch (err) {
			console.error('Refresh token failed. Reason: ', err);
			return res.send({ ok: false, accessToken: '' });
		}

		// Token is valid and we can send back accessToken
		const user = await User.findOne({ id: payload.userId });

		if (!user) {
			return res.send({ ok: false, accessToken: '' });
		}

		console.log(user);

		// Check if the version of token matches the version saved in the user
		if (user.tokenVersion !== payload.tokenVersion) {
			return res.send({ ok: false, accessToken: '' });
		}

		sendRefreshToken(res, createRefreshToken(user));

		// Create a new access token if everything's okay
		return res.send({ ok: true, accessToken: createAccessToken(user) });
	});

	await createConnection();

	const apolloServer = new ApolloServer({
		schema: await buildSchema({
			resolvers: [UserResolver],
		}),
		context: ({ req, res }) => ({ req, res }),
	});

	apolloServer.applyMiddleware({ app, cors: false });

	app.listen(4000, () => {
		console.log('Server up and running on http://localhost:4000/ ');
		console.log('GraphQL server up and running on http://localhost:4000/graphql');
	});
})();

/*//createConnection().then(async connection => {*/

//console.log("Inserting a new user into the database...");
//const user = new User();
//user.firstName = "Timber";
//user.lastName = "Saw";
//user.age = 25;
//await connection.manager.save(user);
//console.log("Saved a new user with id: " + user.id);

//console.log("Loading users from the database...");
//const users = await connection.manager.find(User);
//console.log("Loaded users: ", users);

//console.log("Here you can setup and run express/koa/any other framework.");

/*}).catch(error => console.log(error));*/
