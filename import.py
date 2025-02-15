import csv
import sqlite3

# Connect to the SQLite database
conn = sqlite3.connect('prisma/dev.db')
cursor = conn.cursor()

# Create tables if they don't exist
cursor.execute('''
CREATE TABLE IF NOT EXISTS HospitalNetworks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    networkname TEXT NOT NULL
)
''')

cursor.execute('''
CREATE TABLE IF NOT EXISTS HospitalList (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hospitalName TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    hospitalNetworkId INTEGER NOT NULL,
    state TEXT NOT NULL,
    FOREIGN KEY (hospitalNetworkId) REFERENCES HospitalNetworks(id)
)
''')

# Read the CSV file
with open('us_hospitals.csv', newline='') as csvfile:
    reader = csv.DictReader(csvfile)
    network_cache = {}

    for row in reader:
        network_name = row['Hospital Network']
        if network_name not in network_cache:
            cursor.execute('INSERT INTO HospitalNetworks (networkname) VALUES (?)', (network_name,))
            network_cache[network_name] = cursor.lastrowid

        cursor.execute('''
        INSERT INTO HospitalList (hospitalName, latitude, longitude, hospitalNetworkId, state)
        VALUES (?, ?, ?, ?, ?)
        ''', (row['Hospital Name'], row['Latitude'], row['Longitude'], network_cache[network_name], row['State']))

# Commit the transaction and close the connection
conn.commit()
conn.close()