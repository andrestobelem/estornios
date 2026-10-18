export interface Vector3 { x: number; y: number; z: number }
export interface Bird { id: number; position: Vector3; velocity: Vector3 }
export interface SimulationOptions {
  count: number; seed: number; bounds: Vector3;
  perceptionRadius: number; separationRadius: number; neighbors: number;
  minSpeed: number; maxSpeed: number; maxAcceleration: number;
  separationWeight: number; alignmentWeight: number; cohesionWeight: number;
}
