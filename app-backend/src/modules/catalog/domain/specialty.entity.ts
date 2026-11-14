/// ARCHIVO: src/modules/catalog/domain/specialty.entity.ts
/// Entidad de dominio que representa una Especialidad Médica global en el catálogo.

export interface SpecialtyProps {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Specialty {
  private constructor(private props: SpecialtyProps) {}

  public static create(props: {
    id: number;
    name: string;
    description?: string | null;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }): Specialty {
    const now = new Date();
    return new Specialty({
      id: props.id,
      name: props.name.trim(),
      description: props.description ?? null,
      isActive: props.isActive ?? true,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  public get id(): number {
    return this.props.id;
  }

  public get name(): string {
    return this.props.name;
  }

  public get description(): string | null {
    return this.props.description;
  }

  public get isActive(): boolean {
    return this.props.isActive;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  public restore(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  public update(data: { name?: string; description?: string | null; isActive?: boolean }): void {
    if (data.name !== undefined) {
      this.props.name = data.name.trim();
    }
    if (data.description !== undefined) {
      this.props.description = data.description;
    }
    if (data.isActive !== undefined) {
      this.props.isActive = data.isActive;
    }
    this.props.updatedAt = new Date();
  }

  public toSnapshot(): SpecialtyProps {
    return { ...this.props };
  }
}

