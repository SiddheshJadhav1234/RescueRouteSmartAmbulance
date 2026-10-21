-- ====================================================================
-- RescueRoute PostgreSQL Database Schema & Seed Data (Supabase Compatible)
-- Project: RescueRoute - Smart Emergency Dispatch System
-- Focus: Graph Algorithms, Priority Queues, Concurrency-Safe Dispatch
-- Location: Pune Metropolitan Area Simulation
-- ====================================================================

-- 1. Enable UUID Extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if re-running
DROP TABLE IF EXISTS dispatch_route_steps CASCADE;
DROP TABLE IF EXISTS dispatches CASCADE;
DROP TABLE IF EXISTS emergencies CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;
DROP TABLE IF EXISTS ambulances CASCADE;
DROP TABLE IF EXISTS roads CASCADE;
DROP TABLE IF EXISTS locations CASCADE;

-- 3. Locations Table (Graph Vertices)
CREATE TABLE locations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    zone VARCHAR(50) NOT NULL,
    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,
    landmark TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_zone ON locations(zone);

-- 4. Roads Table (Graph Weighted Edges)
CREATE TABLE roads (
    id VARCHAR(50) PRIMARY KEY,
    source_location_id VARCHAR(50) NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    target_location_id VARCHAR(50) NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    road_name VARCHAR(150) NOT NULL,
    distance_km NUMERIC(5,2) NOT NULL CHECK (distance_km > 0),
    base_travel_time_minutes NUMERIC(5,2) NOT NULL CHECK (base_travel_time_minutes > 0),
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    block_reason TEXT,
    is_bidirectional BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_roads_source ON roads(source_location_id);
CREATE INDEX idx_roads_target ON roads(target_location_id);
CREATE INDEX idx_roads_blocked ON roads(is_blocked);

-- 5. Ambulances Table
CREATE TABLE ambulances (
    id VARCHAR(50) PRIMARY KEY,
    vehicle_number VARCHAR(30) UNIQUE NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('ALS', 'BLS', 'PATIENT_TRANSPORT')),
    status VARCHAR(30) NOT NULL CHECK (status IN ('AVAILABLE', 'DISPATCHED', 'MAINTENANCE', 'EN_ROUTE')),
    current_location_id VARCHAR(50) NOT NULL REFERENCES locations(id),
    driver_name VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    equipment_level VARCHAR(100) NOT NULL,
    last_status_update TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ambulances_status ON ambulances(status);
CREATE INDEX idx_ambulances_location ON ambulances(current_location_id);

-- 6. Hospitals Table
CREATE TABLE hospitals (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    location_id VARCHAR(50) NOT NULL REFERENCES locations(id),
    total_beds INTEGER NOT NULL CHECK (total_beds > 0),
    available_beds INTEGER NOT NULL CHECK (available_beds >= 0),
    icu_available INTEGER NOT NULL DEFAULT 0 CHECK (icu_available >= 0),
    specialties TEXT[] NOT NULL,
    contact_emergency VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_bed_limit CHECK (available_beds <= total_beds)
);

CREATE INDEX idx_hospitals_location ON hospitals(location_id);

-- 7. Emergencies Table
CREATE TABLE emergencies (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    patient_name VARCHAR(100) NOT NULL,
    caller_contact VARCHAR(30),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    location_id VARCHAR(50) NOT NULL REFERENCES locations(id),
    required_specialty VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED')),
    notes TEXT,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emergencies_status ON emergencies(status);
CREATE INDEX idx_emergencies_severity ON emergencies(severity);
CREATE INDEX idx_emergencies_reported_at ON emergencies(reported_at);

-- 8. Dispatches Table
CREATE TABLE dispatches (
    id VARCHAR(50) PRIMARY KEY,
    emergency_id VARCHAR(50) NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
    ambulance_id VARCHAR(50) NOT NULL REFERENCES ambulances(id),
    hospital_id VARCHAR(50) NOT NULL REFERENCES hospitals(id),
    status VARCHAR(30) NOT NULL CHECK (status IN ('DISPATCHED', 'AMBULANCE_ARRIVED', 'PATIENT_PICKED_UP', 'AT_HOSPITAL', 'COMPLETED', 'CANCELLED')),
    total_travel_time_minutes NUMERIC(6,2) NOT NULL,
    total_distance_km NUMERIC(6,2) NOT NULL,
    dijkstra_path TEXT[] NOT NULL,
    algorithm_used VARCHAR(50) DEFAULT 'C++ Dijkstra (MinHeap)',
    dispatched_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_dispatches_ambulance ON dispatches(ambulance_id);
CREATE INDEX idx_dispatches_emergency ON dispatches(emergency_id);
CREATE INDEX idx_dispatches_status ON dispatches(status);

-- 9. Dispatch Route Steps Table
CREATE TABLE dispatch_route_steps (
    id VARCHAR(50) PRIMARY KEY,
    dispatch_id VARCHAR(50) NOT NULL REFERENCES dispatches(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    from_location_id VARCHAR(50) NOT NULL REFERENCES locations(id),
    to_location_id VARCHAR(50) NOT NULL REFERENCES locations(id),
    road_id VARCHAR(50) NOT NULL REFERENCES roads(id),
    road_name VARCHAR(150) NOT NULL,
    travel_time_minutes NUMERIC(5,2) NOT NULL,
    distance_km NUMERIC(5,2) NOT NULL
);

CREATE INDEX idx_dispatch_steps_dispatch ON dispatch_route_steps(dispatch_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE roads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambulances ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_route_steps ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated and anon users for dashboard display
CREATE POLICY "Public read locations" ON locations FOR SELECT USING (true);
CREATE POLICY "Public read roads" ON roads FOR SELECT USING (true);
CREATE POLICY "Public read ambulances" ON ambulances FOR SELECT USING (true);
CREATE POLICY "Public read hospitals" ON hospitals FOR SELECT USING (true);
CREATE POLICY "Public read emergencies" ON emergencies FOR SELECT USING (true);
CREATE POLICY "Public read dispatches" ON dispatches FOR SELECT USING (true);
CREATE POLICY "Public read steps" ON dispatch_route_steps FOR SELECT USING (true);

-- Allow operational inserts and updates
CREATE POLICY "Operator manage emergencies" ON emergencies FOR ALL USING (true);
CREATE POLICY "Operator manage dispatches" ON dispatches FOR ALL USING (true);
CREATE POLICY "Operator update ambulances" ON ambulances FOR UPDATE USING (true);
CREATE POLICY "Operator update roads" ON roads FOR UPDATE USING (true);

-- ====================================================================
-- REALISTIC DETERMINISTIC SEED DATA (PUNE METROPOLITAN AREA)
-- Note: All coordinates, travel times, and counts are educational simulation values.
-- ====================================================================

INSERT INTO locations (id, name, zone, latitude, longitude, landmark) VALUES
('LOC_HINJEWADI', 'Hinjewadi Phase 1', 'West Tech Corridor', 18.591300, 73.738900, 'Near Rajiv Gandhi Infotech Park'),
('LOC_WAKAD', 'Wakad Junction', 'West Zone', 18.598700, 73.766700, 'Dange Chowk Flyover'),
('LOC_BANER', 'Baner High Street', 'West Suburb', 18.559000, 73.786800, 'Near Balewadi High Street Exit'),
('LOC_BALEWADI', 'Balewadi Sports Complex', 'West Suburb', 18.577200, 73.771200, 'Shree Shiv Chhatrapati Sports Complex'),
('LOC_AUNDH', 'Aundh Medical Hub', 'Central-West', 18.558000, 73.807000, 'Parihar Chowk'),
('LOC_PIMPLE_SAUDAGAR', 'Pimple Saudagar', 'North-West PCMC', 18.595400, 73.801000, 'Kunil Chowk / Roseland Residency'),
('LOC_SHIVAJINAGAR', 'Shivajinagar Station', 'Central Pune', 18.531400, 73.844600, 'Near COEP Tech Campus'),
('LOC_DECCAN', 'Deccan Gymkhana', 'South-Central', 18.516700, 73.841500, 'Goodluck Cafe Circle'),
('LOC_KOTHRUD', 'Kothrud Paud Road', 'South-West', 18.507400, 73.807700, 'Near MIT World Peace University'),
('LOC_SWARGATE', 'Swargate Transit Hub', 'South Pune', 18.501800, 73.863600, 'Swargate ST Stand');

INSERT INTO roads (id, source_location_id, target_location_id, road_name, distance_km, base_travel_time_minutes, is_blocked, is_bidirectional) VALUES
('ROAD_1', 'LOC_HINJEWADI', 'LOC_WAKAD', 'Hinjewadi-Wakad Bridge Road', 4.5, 8.0, FALSE, TRUE),
('ROAD_2', 'LOC_WAKAD', 'LOC_BALEWADI', 'Wakad-Balewadi Link Expressway', 3.2, 5.0, FALSE, TRUE),
('ROAD_3', 'LOC_BALEWADI', 'LOC_BANER', 'Balewadi High Street Link', 2.8, 6.0, FALSE, TRUE),
('ROAD_4', 'LOC_WAKAD', 'LOC_PIMPLE_SAUDAGAR', 'Wakad-Pimple Saudagar BRT Corridor', 4.0, 7.0, FALSE, TRUE),
('ROAD_5', 'LOC_PIMPLE_SAUDAGAR', 'LOC_AUNDH', 'Aundh-Ravet Spine Road', 5.2, 9.0, FALSE, TRUE),
('ROAD_6', 'LOC_BANER', 'LOC_AUNDH', 'Baner Road', 3.8, 7.0, FALSE, TRUE),
('ROAD_7', 'LOC_AUNDH', 'LOC_SHIVAJINAGAR', 'Ganeshkhind Road Arterial', 6.5, 12.0, FALSE, TRUE),
('ROAD_8', 'LOC_SHIVAJINAGAR', 'LOC_DECCAN', 'FC Road / JM Road Connecting Flyover', 2.6, 5.0, FALSE, TRUE),
('ROAD_9', 'LOC_DECCAN', 'LOC_KOTHRUD', 'Karve Road Corridor', 4.8, 9.0, FALSE, TRUE),
('ROAD_10', 'LOC_DECCAN', 'LOC_SWARGATE', 'Tilak Road Express', 3.5, 8.0, FALSE, TRUE),
('ROAD_11', 'LOC_SHIVAJINAGAR', 'LOC_SWARGATE', 'Bajirao Road Rapid Link', 4.2, 10.0, FALSE, TRUE),
('ROAD_12', 'LOC_BANER', 'LOC_SHIVAJINAGAR', 'Pashan-University Elevated Road', 8.2, 14.0, FALSE, TRUE),
('ROAD_13', 'LOC_KOTHRUD', 'LOC_BANER', 'Chandani Chowk - Baner Bypass (NH-48)', 7.5, 11.0, FALSE, TRUE);

INSERT INTO ambulances (id, vehicle_number, type, status, current_location_id, driver_name, contact_number, equipment_level) VALUES
('AMB_01', 'MH-12-RN-1011', 'ALS', 'AVAILABLE', 'LOC_WAKAD', 'Rajesh Patil', '+91 98230 11011', 'Defibrillator, Ventilator, Syringe Pump, Cardiac Monitor'),
('AMB_02', 'MH-12-RN-2022', 'ALS', 'AVAILABLE', 'LOC_SHIVAJINAGAR', 'Sunil More', '+91 98230 22022', 'Defibrillator, Ventilator, Oxygen Suction, ICU Kit'),
('AMB_03', 'MH-12-RN-3033', 'BLS', 'AVAILABLE', 'LOC_BANER', 'Ganesh Shinde', '+91 98230 33033', 'Basic Stretcher, Pulse Oximeter, Oxygen Cylinder'),
('AMB_04', 'MH-12-RN-4044', 'BLS', 'AVAILABLE', 'LOC_AUNDH', 'Vikas Deshmukh', '+91 98230 44044', 'First Aid Station, Splints, Automated BP, Oxygen Tank'),
('AMB_05', 'MH-12-RN-5055', 'ALS', 'DISPATCHED', 'LOC_KOTHRUD', 'Nilesh Kadam', '+91 98230 55055', 'Full Cardiac Life Support, Transport Incubator'),
('AMB_06', 'MH-12-RN-6066', 'PATIENT_TRANSPORT', 'MAINTENANCE', 'LOC_SWARGATE', 'Sachin Pawar', '+91 98230 66066', 'Wheelchair Lift, Patient Cot');

INSERT INTO hospitals (id, name, location_id, total_beds, available_beds, icu_available, specialties, contact_emergency) VALUES
('HOSP_01', 'Jupiter Hospital Pune', 'LOC_BANER', 350, 48, 12, ARRAY['Cardiology', 'Trauma', 'Neurology', 'Multispecialty'], '+91 20 2799 9999'),
('HOSP_02', 'Sancheti Orthopedic & Trauma Centre', 'LOC_SHIVAJINAGAR', 200, 22, 6, ARRAY['Trauma', 'Orthopedics', 'Spine Care'], '+91 20 2899 9100'),
('HOSP_03', 'Sahyadri Super Speciality Hospital', 'LOC_DECCAN', 280, 15, 4, ARRAY['Cardiology', 'Neurology', 'Organ Transplant', 'Multispecialty'], '+91 20 6721 3000'),
('HOSP_04', 'Deenanath Mangeshkar Hospital', 'LOC_KOTHRUD', 500, 65, 18, ARRAY['Cardiology', 'Pediatrics', 'Oncology', 'Emergency Care', 'Multispecialty'], '+91 20 4015 1000'),
('HOSP_05', 'Medipoint Hospital', 'LOC_AUNDH', 120, 18, 5, ARRAY['General', 'Emergency Care', 'Maternity'], '+91 20 6790 0000');

INSERT INTO emergencies (id, title, patient_name, caller_contact, severity, location_id, required_specialty, status, notes, reported_at) VALUES
('EMG_01', 'Suspected Acute Myocardial Infarction', 'Ramesh Kulkarni (62M)', '+91 98901 12345', 'CRITICAL', 'LOC_HINJEWADI', 'Cardiology', 'PENDING', 'Severe chest pain radiating to left arm, sweating, shortness of breath.', NOW() - INTERVAL '12 minutes'),
('EMG_02', 'Motorcycle Highway Collision', 'Priya Joshi (28F)', '+91 98902 23456', 'HIGH', 'LOC_PIMPLE_SAUDAGAR', 'Trauma', 'PENDING', 'Compound fracture in lower right limb, moderate blood loss, conscious.', NOW() - INTERVAL '8 minutes'),
('EMG_03', 'Elderly Fall with Hip Pain', 'Kamalakar Joshi (75M)', '+91 98903 34567', 'MEDIUM', 'LOC_BANER', 'Orthopedics', 'PENDING', 'Unable to stand after bathroom slip, severe hip tenderness, stable vitals.', NOW() - INTERVAL '19 minutes'),
('EMG_04', 'High Grade Viral Fever with Dehydration', 'Aarav Mehta (8M)', '+91 98904 45678', 'LOW', 'LOC_BALEWADI', 'General', 'PENDING', 'Temperature 103F for 48 hrs, mild lethargy, drinking fluids with assistance.', NOW() - INTERVAL '35 minutes');
