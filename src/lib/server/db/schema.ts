import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const rooms = sqliteTable('rooms', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	code: text('code').notNull().unique(),
	hostName: text('host_name').notNull(),
	status: text('status').notNull().default('waiting'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const players = sqliteTable('players', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	roomId: text('room_id')
		.notNull()
		.references(() => rooms.id),
	name: text('name').notNull(),
	socketId: text('socket_id'),
	// Secure token for player authentication (never sent to other clients)
	authToken: text('auth_token')
		.notNull()
		.$defaultFn(() => crypto.randomUUID()),
	cards: text('cards', { mode: 'json' })
		.$type<string[]>()
		.default(sql`'[]'`),
	// Cards that have been revealed (lost influence)
	revealedCards: text('revealed_cards', { mode: 'json' })
		.$type<string[]>()
		.default(sql`'[]'`),
	coins: integer('coins').notNull().default(2),
	isAlive: integer('is_alive', { mode: 'boolean' }).notNull().default(true),
	isHost: integer('is_host', { mode: 'boolean' }).notNull().default(false),
	joinedAt: integer('joined_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const gameStates = sqliteTable('game_states', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	roomId: text('room_id')
		.notNull()
		.references(() => rooms.id),
	currentTurn: text('current_turn'),
	deck: text('deck', { mode: 'json' }).$type<string[]>(),
	actionLog: text('action_log', { mode: 'json' })
		.$type<any[]>()
		.default(sql`'[]'`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});
