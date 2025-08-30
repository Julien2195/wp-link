<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: \App\Repository\ScanLinkRepository::class)]
#[ORM\Table(name: 'scan_links')]
class ScanLink
{
    public const TYPE_INTERNAL = 'internal';
    public const TYPE_EXTERNAL = 'external';

    public const STATUS_OK = 'ok';
    public const STATUS_BROKEN = 'broken';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Scan::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Scan $scan;

    #[ORM\Column(type: 'string', length: 2048)]
    private string $url;

    #[ORM\Column(type: 'string', length: 16)]
    private string $type;

    #[ORM\Column(type: 'string', length: 16)]
    private string $status;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $source = null;

    #[ORM\Column(type: 'smallint', nullable: true)]
    private ?int $httpCode = null;

    public function getId(): ?int { return $this->id; }

    public function getScan(): Scan { return $this->scan; }
    public function setScan(Scan $scan): self { $this->scan = $scan; return $this; }

    public function getUrl(): string { return $this->url; }
    public function setUrl(string $url): self { $this->url = $url; return $this; }

    public function getType(): string { return $this->type; }
    public function setType(string $type): self { $this->type = $type; return $this; }

    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }

    public function getSource(): ?string { return $this->source; }
    public function setSource(?string $source): self { $this->source = $source; return $this; }

    public function getHttpCode(): ?int { return $this->httpCode; }
    public function setHttpCode(?int $httpCode): self { $this->httpCode = $httpCode; return $this; }
}

