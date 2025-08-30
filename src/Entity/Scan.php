<?php

declare(strict_types=1);

namespace App\Entity;

use DateInterval;
use DateTimeImmutable;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: \App\Repository\ScanRepository::class)]
#[ORM\Table(name: 'scans')]
class Scan
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_RUNNING = 'running';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 32)]
    private string $status = self::STATUS_PENDING;

    #[ORM\Column(type: 'datetime_immutable')]
    private DateTimeImmutable $startedAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?DateTimeImmutable $finishedAt = null;

    #[ORM\Column(type: 'boolean')]
    private bool $includeMenus = false;

    #[ORM\Column(type: 'boolean')]
    private bool $includeWidgets = false;

    // Progress metrics
    #[ORM\Column(type: 'integer')]
    private int $totalLinks = 0;

    #[ORM\Column(type: 'integer')]
    private int $processedLinks = 0;

    // Aggregated stats for history
    #[ORM\Column(type: 'integer')]
    private int $total = 0;

    #[ORM\Column(type: 'integer')]
    private int $ok = 0;

    #[ORM\Column(type: 'integer')]
    private int $broken = 0;

    #[ORM\Column(type: 'integer')]
    private int $internal = 0;

    #[ORM\Column(type: 'integer')]
    private int $external = 0;

    public function __construct()
    {
        $this->startedAt = new DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }

    public function getStartedAt(): DateTimeImmutable { return $this->startedAt; }
    public function setStartedAt(DateTimeImmutable $startedAt): self { $this->startedAt = $startedAt; return $this; }

    public function getFinishedAt(): ?DateTimeImmutable { return $this->finishedAt; }
    public function setFinishedAt(?DateTimeImmutable $finishedAt): self { $this->finishedAt = $finishedAt; return $this; }

    public function getIncludeMenus(): bool { return $this->includeMenus; }
    public function setIncludeMenus(bool $v): self { $this->includeMenus = $v; return $this; }

    public function getIncludeWidgets(): bool { return $this->includeWidgets; }
    public function setIncludeWidgets(bool $v): self { $this->includeWidgets = $v; return $this; }

    public function getTotalLinks(): int { return $this->totalLinks; }
    public function setTotalLinks(int $v): self { $this->totalLinks = $v; return $this; }

    public function getProcessedLinks(): int { return $this->processedLinks; }
    public function setProcessedLinks(int $v): self { $this->processedLinks = $v; return $this; }

    public function getTotal(): int { return $this->total; }
    public function setTotal(int $v): self { $this->total = $v; return $this; }

    public function getOk(): int { return $this->ok; }
    public function setOk(int $v): self { $this->ok = $v; return $this; }

    public function getBroken(): int { return $this->broken; }
    public function setBroken(int $v): self { $this->broken = $v; return $this; }

    public function getInternal(): int { return $this->internal; }
    public function setInternal(int $v): self { $this->internal = $v; return $this; }

    public function getExternal(): int { return $this->external; }
    public function setExternal(int $v): self { $this->external = $v; return $this; }

    public function getDurationSeconds(): ?int
    {
        if (!$this->finishedAt) { return null; }
        return $this->finishedAt->getTimestamp() - $this->startedAt->getTimestamp();
    }
}

