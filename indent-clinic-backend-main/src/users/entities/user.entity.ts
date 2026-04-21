import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column()
    estado: string;

    @Column({ nullable: true, type: 'text' })
    foto: string;


    @OneToMany('Propuesta', (propuesta: any) => propuesta.usuario)
    propuestas: any[];

    @Column('simple-json', { nullable: true })
    permisos: string[];
}

