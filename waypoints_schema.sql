-- Create the waypoints table
CREATE TABLE waypoints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    theta FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) but allow anonymous access for your dashboard
ALTER TABLE waypoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON waypoints FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON waypoints FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON waypoints FOR DELETE USING (true);
