import { Exclude } from 'class-transformer'
import { IsEmail, IsString } from 'class-validator'
import { Role } from 'src/modules/role/entities/role.entity'
import {
    BaseEntity,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm'
@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn('increment')
    id: number

    @Column({ type: 'varchar', length: 30, nullable: true })
    name: string

    @Column({
        type: 'varchar',
        length: 50,
        unique: true,
        nullable: false
    })
    @IsEmail()
    email: string

    @Exclude()
    @Column({ type: 'varchar', length: 255, nullable: false })
    @IsString()
    password: string

    @Column({ type: 'varchar', length: 30, nullable: true })
    avatarUrl: string

    @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
    publicAddress: string

    // @Column({
    //     type: 'int'
    // })
    // roleId: number

    @ManyToOne(() => Role)
    role: Role

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    @DeleteDateColumn()
    deletedAt: Date
}
