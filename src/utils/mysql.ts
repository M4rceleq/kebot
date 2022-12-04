import mysql from 'mysql2';
import consolaGlobalInstance from 'consola';

class Statement {
    private query: string;
    private db: MySQL;
    private isPluck: boolean = false;

    constructor(query: string, db: MySQL) {
        this.query = query;
        this.db = db;
    }

    /**
     * Ustawia żeby zamiast zwarcać obiekt z atrybutami, zwrócić wartość tego pierwszego atrybutu.
     * @param toggleState boolean decydujący o tym czy chcesz włączyć ten tryb (domyślnie: true)
     */
    pluck(toggleState: boolean = true): this {
        this.isPluck = toggleState;
        return this;
    }

    /**
     * Wywołuje zapytanie i zwraca wyłącznie jeden (pierwszy) rekord
     * @param params opcjonalne parametry w postaci tablicy, które wskoczą na miejsce znaków zapytania
     */
    async get(...params: any[]): Promise<any> {
        const res = await this.db.run(this.db.format(this.query, params));
        if(!res || res.length === 0) return null;
        
        if(this.isPluck) return res[0][Object.keys(res[0])[0]];
        else return res[0];
    }

    /**
     * Wywołuje zapytanie i zwraca wszystkie rekordy
     * @param params opcjonalne parametry w postaci tablicy, które wskoczą na miejsce znaków zapytania
     */
    async all(...params: any[]): Promise<any[]> {
        const res: any[] = await this.db.run(this.db.format(this.query, params));
        if(!res || res.length === 0) return [];
        else if(this.isPluck) return res.map(obj => obj[Object.keys(obj)[0]])
        else return res;
    }

    /**
     * Wywołuje zapytanie i zwraca jak oraz czy się ono powiodło 
     * @param params opcjonalne parametry w postaci tablicy, które wskoczą na miejsce znaków zapytania
     */
    async run(...params: any[]): Promise<mysql.OkPacket> {
        return await this.db.run(this.db.format(this.query, params));
    }
}

interface DatabaseConstructorData {
    host?: string, 
    port?: string | number, 
    user: string, 
    password?: string, 
    database: string
}

class MySQL {
    private pool: mysql.Pool;

    constructor(data: DatabaseConstructorData) {
        const { host, port, user, password, database } = data;
        if(!database) throw 'MySQL\'s constructor error: database must be defined';
        if(!user) throw 'MySQL\'s constructor error: user must be defined';
        this.pool = mysql.createPool({ 
            host,
            port: typeof port === 'string' ? parseInt(port) : port,
            user, 
            password, 
            database, 
            connectionLimit: 10,
        });
    }

    /**
     * Tworzy zapytanie do bazy danych.
     * @param sql zapytanie SQL do zalogowanej bazy
     */
    public prepare(sql: string): Statement {
        const statement = new Statement(sql, this);
        return statement;
    }

    /**
     * Wysyła zapytanie do bazy danych.
     * @param query zapytanie SQL do zalogowanej bazy
     */
    public readonly run = async(query: string): Promise<any> => new Promise(resolve => {
        this.pool.query(query, (err, results) => err ? consolaGlobalInstance.error(err) : resolve(results));
    })
    /**
     * Formatuje zapytanie do bazy danych, aby umożliwić poprawne oraz bezpieczne użycie zmiennych.
     * @param sql zapytanie do zalogowanej bazy
     * @param params parametry w postaci tablicy
     */
    public readonly format = (sql: string, params: any[]) => mysql.format(sql, params);
};

export default MySQL;